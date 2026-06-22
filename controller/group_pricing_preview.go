package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/billing_setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
)

// 分组定价预览接口(2026-06-22, plan mellow-growing-waterfall.md):
// 在「系统设置 → 计费 → 分组定价」展示每个模型在某分组下的实际售价/成本/毛利,
// 用于运营核对官方价 × 分组倍率后有没有配错。成本/毛利仅 Root 可见(Admin 裁剪)。
//
//	实际售价 = 官方基础扣费 × GroupRatio[group]
//	实际成本 = 官方基础扣费 × GroupCostRatio[group](未配置则继承 GroupRatio)
//	毛利率   = (GroupRatio − GroupCostRatio) / GroupRatio

type groupPricingPreviewItem struct {
	Model string `json:"model"`
	// ratio: 输入/输出/缓存 每 1M 单价($/1M); fixed: 每请求价($/request); expression: 留空
	BillingMode          string   `json:"billing_mode"` // ratio | fixed | expression
	HasPrice             bool     `json:"has_price"`
	BaseInputPricePerM   *float64 `json:"base_input_price_per_m,omitempty"`
	BaseOutputPricePerM  *float64 `json:"base_output_price_per_m,omitempty"`
	BaseCachePricePerM   *float64 `json:"base_cache_price_per_m,omitempty"`
	FinalInputPricePerM  *float64 `json:"final_input_price_per_m,omitempty"`
	FinalOutputPricePerM *float64 `json:"final_output_price_per_m,omitempty"`
	FinalCachePricePerM  *float64 `json:"final_cache_price_per_m,omitempty"`
	BaseRequestPrice     *float64 `json:"base_request_price,omitempty"`
	FinalRequestPrice    *float64 `json:"final_request_price,omitempty"`
	// 以下成本/毛利字段仅 Root 返回(Admin 裁剪)
	FinalInputCostPerM  *float64 `json:"final_input_cost_per_m,omitempty"`
	FinalOutputCostPerM *float64 `json:"final_output_cost_per_m,omitempty"`
	FinalCacheCostPerM  *float64 `json:"final_cache_cost_per_m,omitempty"`
	FinalRequestCost    *float64 `json:"final_request_cost,omitempty"`
	GrossMargin         *float64 `json:"gross_margin,omitempty"`

	EnabledChannels int      `json:"enabled_channel_count"`
	TotalChannels   int      `json:"total_channel_count"`
	Statuses        []string `json:"statuses"`
}

func ptrFloat(f float64) *float64 { return &f }

// GetGroupPricingPreview 分组定价预览。
// GET /api/option/pricing/group-preview?group=vip&include_disabled=true
// 权限: AdminAuth(管理员以上); 成本/毛利字段仅 Root 返回。
func GetGroupPricingPreview(c *gin.Context) {
	group := c.Query("group")
	isRoot := c.GetInt("role") >= common.RoleRootUser

	// auto 是逻辑分组, 不直接计费 —— 提示选具体分组, 不展示价格表。
	if group == "" || group == "auto" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": gin.H{
				"group":   group,
				"is_auto": true,
				"items":   []groupPricingPreviewItem{},
				"message": "auto 是自动分组，会在请求时根据模型和渠道解析为具体分组；请选择具体分组查看最终售价和成本。",
			},
		})
		return
	}

	saleRatio := ratio_setting.GetGroupRatio(group)
	costRatio, costSource := ratio_setting.GetGroupCostRatioWithSource(group)
	saleRatioConfigured := ratio_setting.ContainsGroupRatio(group)

	// 毛利率只依赖两个倍率(与 base 无关): (sale − cost) / sale
	var grossMargin *float64
	if isRoot && saleRatio > 0 {
		grossMargin = ptrFloat((saleRatio - costRatio) / saleRatio)
	}

	// 渠道计数(按模型聚合 enabled/total)
	channelCounts := model.GetModelChannelCountsByGroup(group)

	// 模型来源: GetPricing()(启用渠道模型 + ratio/price/billing) 为基准
	pricingList := model.GetPricing()
	items := make([]groupPricingPreviewItem, 0, len(pricingList))
	seen := make(map[string]bool, len(pricingList))

	perMFactor := 1000000.0 / common.QuotaPerUnit // ModelRatio → $/1M 换算系数

	for _, p := range pricingList {
		if seen[p.ModelName] {
			continue
		}
		seen[p.ModelName] = true
		item := buildPreviewItem(p, group, saleRatio, costRatio, costSource, saleRatioConfigured, grossMargin, perMFactor, channelCounts, isRoot)
		items = append(items, item)
	}

	resp := gin.H{
		"group":      group,
		"is_auto":    false,
		"sale_ratio": saleRatio,
		"items":      items,
	}
	if isRoot {
		resp["cost_ratio"] = costRatio
		resp["cost_ratio_source"] = costSource
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": resp})
}

func buildPreviewItem(
	p model.Pricing,
	group string,
	saleRatio, costRatio float64,
	costSource string,
	saleRatioConfigured bool,
	grossMargin *float64,
	perMFactor float64,
	channelCounts map[string]model.ModelChannelCount,
	isRoot bool,
) groupPricingPreviewItem {
	item := groupPricingPreviewItem{
		Model:     p.ModelName,
		Statuses:  []string{},
		GrossMargin: grossMargin,
	}

	cc := channelCounts[p.ModelName]
	item.EnabledChannels = cc.EnabledChannels
	item.TotalChannels = cc.TotalChannels

	isExpr := billing_setting.GetBillingMode(p.ModelName) == billing_setting.BillingModeTieredExpr
	switch {
	case isExpr:
		item.BillingMode = "expression"
		item.HasPrice = p.BillingExpr != ""
	case p.ModelPrice > 0:
		item.BillingMode = "fixed"
		item.HasPrice = true
		base := p.ModelPrice
		item.BaseRequestPrice = ptrFloat(base)
		item.FinalRequestPrice = ptrFloat(base * saleRatio)
		if isRoot {
			item.FinalRequestCost = ptrFloat(base * costRatio)
		}
	default:
		item.BillingMode = "ratio"
		item.HasPrice = p.ModelRatio > 0
		if p.ModelRatio > 0 {
			baseIn := p.ModelRatio * perMFactor
			item.BaseInputPricePerM = ptrFloat(baseIn)
			item.BaseOutputPricePerM = ptrFloat(baseIn * p.CompletionRatio)
			if p.CacheRatio != nil {
				item.BaseCachePricePerM = ptrFloat(baseIn * *p.CacheRatio)
			}
			item.FinalInputPricePerM = ptrFloat(baseIn * saleRatio)
			item.FinalOutputPricePerM = ptrFloat(baseIn * p.CompletionRatio * saleRatio)
			if p.CacheRatio != nil {
				item.FinalCachePricePerM = ptrFloat(baseIn * *p.CacheRatio * saleRatio)
			}
			if isRoot {
				item.FinalInputCostPerM = ptrFloat(baseIn * costRatio)
				item.FinalOutputCostPerM = ptrFloat(baseIn * p.CompletionRatio * costRatio)
				if p.CacheRatio != nil {
					item.FinalCacheCostPerM = ptrFloat(baseIn * *p.CacheRatio * costRatio)
				}
			}
		}
	}

	// 状态标记
	if !item.HasPrice {
		item.Statuses = append(item.Statuses, "missing_price")
	}
	if item.HasPrice && item.EnabledChannels == 0 {
		if item.TotalChannels > 0 {
			item.Statuses = append(item.Statuses, "only_disabled_channels")
		} else {
			item.Statuses = append(item.Statuses, "no_enabled_channel")
		}
	}
	if isRoot && item.HasPrice && saleRatio > 0 && costRatio > saleRatio {
		item.Statuses = append(item.Statuses, "loss")
	}
	if isRoot && costSource == "inherited" {
		item.Statuses = append(item.Statuses, "cost_ratio_inherited")
	}
	if !saleRatioConfigured {
		item.Statuses = append(item.Statuses, "group_ratio_default")
	}
	if len(item.Statuses) == 0 {
		item.Statuses = append(item.Statuses, "normal")
	}
	return item
}
