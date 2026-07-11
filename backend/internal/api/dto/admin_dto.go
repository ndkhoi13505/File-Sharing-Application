package dto

import "github.com/ndkhoi13505/File-Sharing-Application/pkg/utils"

type UpdatePolicyRequest struct {
	MaxFileSizeMB            *int `json:"maxFileSizeMB" validate:"omitempty,min_int=1,max_int=500"` // Ví dụ: max 500MB
	MinValidityHours         *int `json:"minValidityHours" validate:"omitempty,min_int=1,max_int=24"`
	MaxValidityDays          *int `json:"maxValidityDays" validate:"omitempty,min_int=1,max_int=365"`
	DefaultValidityDays      *int `json:"defaultValidityDays" validate:"omitempty,min_int=1,max_int=365"`
	RequirePasswordMinLength *int `json:"requirePasswordMinLength" validate:"omitempty,min_int=6,max_int=32"`
}

func (r *UpdatePolicyRequest) ToMap() map[string]interface{} {
	updates := make(map[string]interface{})

	if r.MaxFileSizeMB != nil {
		updates[utils.CamelToSnake("MaxFileSizeMB")] = *r.MaxFileSizeMB
	}
	if r.MinValidityHours != nil {
		updates[utils.CamelToSnake("MinValidityHours")] = *r.MinValidityHours
	}
	if r.MaxValidityDays != nil {
		updates[utils.CamelToSnake("MaxValidityDays")] = *r.MaxValidityDays
	}
	if r.DefaultValidityDays != nil {
		updates[utils.CamelToSnake("DefaultValidityDays")] = *r.DefaultValidityDays
	}
	if r.RequirePasswordMinLength != nil {
		updates[utils.CamelToSnake("RequirePasswordMinLength")] = *r.RequirePasswordMinLength
	}

	return updates
}
