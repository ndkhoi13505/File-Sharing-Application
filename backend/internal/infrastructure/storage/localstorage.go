package storage

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/ndkhoi13505/File-Sharing-Application/pkg/utils"
)

type LocalStorage struct {
	UploadDir string
}

func NewLocalStorage(uploadDir string) Storage {
	absPath, err := filepath.Abs(uploadDir)
	if err != nil {
		fmt.Printf("Warning: Failed to get absolute path for %s. Using relative path\n", uploadDir)
		absPath = uploadDir
	}

	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		os.MkdirAll(absPath, 0755)
	}

	return &LocalStorage{UploadDir: absPath}
}

func (s *LocalStorage) SaveFile(file *multipart.FileHeader, filename string) (string, *utils.ReturnStatus) {
	dst := filepath.Join(s.UploadDir, filename)

	src, err := file.Open()
	if err != nil {
		return "", utils.ResponseMsg(utils.ErrCodeInternal, fmt.Sprintf("failed to open file: %s", err))
	}
	defer src.Close()

	out, err := os.Create(dst)
	if err != nil {
		return "", utils.ResponseMsg(utils.ErrCodeInternal, fmt.Sprintf("failed to create destination file: %s", err))
	}
	defer out.Close()

	_, err = io.Copy(out, src)
	if err != nil {
		return "", utils.ResponseMsg(utils.ErrCodeInternal, fmt.Sprintf("failed to save file: %s", err))
	}

	return dst, nil
}

func (s *LocalStorage) GetFile(filename string) (io.Reader, *utils.ReturnStatus) {
	dst := filepath.Join(s.UploadDir, filename)

	file, err := os.Open(dst)
	if err != nil {
		return nil, utils.ResponseMsg(utils.ErrCodeInternal, fmt.Sprintf("failed to open file: %s", err))
	}

	var reader io.Reader = file

	return reader, nil
}

func (s *LocalStorage) DeleteFile(fileID string) *utils.ReturnStatus {
	path := filepath.Clean(filepath.Join(s.UploadDir, fileID))
	if fileID == "" {
		return utils.ResponseMsg(utils.ErrCodeInternal, "No file ID specified to delete")
	}

	log.Printf("Attempting to delete file:\n- FileID (DB): %s\n- UploadDir: %s\n- Full Path: %s", fileID, s.UploadDir, path)

	err := os.Remove(path)

	if err != nil {
		if os.IsNotExist(err) {
			return utils.Response(utils.ErrCodeFileNotFound)
		}

		return utils.ResponseMsg(utils.ErrCodeInternal, fmt.Sprintf("failed to delete file %s at %s: %s", fileID, path, err))
	}
	return nil
}
