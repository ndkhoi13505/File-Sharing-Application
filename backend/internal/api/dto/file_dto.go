package dto

import "time"

type UploadRequest struct {
	IsPublic				bool		`form:"isPublic"`
	FileNameForValidation	string		`form:"file_validation_placeholder"`
	Password				*string		`form:"password" validate:"omitempty,min=8"`
	AvailableFrom			*time.Time	`form:"availableFrom" time_format:"2006-01-02T15:04:05Z"`
	AvailableTo				*time.Time	`form:"availableTo" time_format:"2006-01-02T15:04:05Z"`
	SharedWith				[]string	`form:"sharedWith"`
}

type AccessibleFile struct {
	FileId		string	`json:"fileid"`
	FileName	string	`json:"filename"`
	OwnerEmail	*string	`json:"owner"`
	HasPassword	bool	`json:"haspassword"`
	ShareToken	string	`json:"sharetoken"`
}
