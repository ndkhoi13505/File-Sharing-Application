package domain

type SharedWith struct {
	Id         string    `json:"id" db:"id"`
	FileId     string    `json:"fileId" db:"file_id"`
	UserId     string    `json:"userId" db:"user_id"`
}

type Shared struct {
	FileId  string   `json:"fileId"`
	UserIds []string `json:"userIds"`
}
