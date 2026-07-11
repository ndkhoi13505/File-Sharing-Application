package storage

import (
	"io"
	"mime/multipart"

	"github.com/ndkhoi13505/File-Sharing-Application/pkg/utils"
)

type Storage interface {
	SaveFile(file *multipart.FileHeader, filename string) (string, *utils.ReturnStatus)
	DeleteFile(filename string) *utils.ReturnStatus
	GetFile(filename string) (io.Reader, *utils.ReturnStatus) // Cần cho Download
}
