package repository

import (
	"context"
	"database/sql"
	"log"

	"github.com/lib/pq"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/domain"
	"github.com/ndkhoi13505/File-Sharing-Application/pkg/utils"
)

type SharedRepository interface {
	ShareFileWithUsers(ctx context.Context, fileID string, emails []string) *utils.ReturnStatus
	GetUsersSharedWith(ctx context.Context, fileID string) (*domain.Shared, *utils.ReturnStatus)
}

type sharedRepository struct {
	db *sql.DB
}

func NewSharedRepository(db *sql.DB) SharedRepository {
	return &sharedRepository{db: db}
}

func (r *sharedRepository) ShareFileWithUsers(ctx context.Context, fileID string, emails []string) *utils.ReturnStatus {
	if len(emails) == 0 {
		return nil
	}

	query := `
		INSERT INTO shared (user_id, file_id)
		SELECT id, $1
		FROM users
		WHERE LOWER(email) = ANY($2)
		ON CONFLICT (user_id, file_id) DO NOTHING
	`

	_, err := r.db.ExecContext(ctx, query, fileID, pq.Array(emails))
	if err != nil {
		log.Println("ShareFileWithUsers error: ", err)
		return utils.ResponseMsg(utils.ErrCodeDatabaseError, err.Error())
	}

	return nil
}

func (r *sharedRepository) GetUsersSharedWith(ctx context.Context, fileID string) (*domain.Shared, *utils.ReturnStatus) {
	query := `SELECT user_id FROM shared WHERE file_id = $1`

	share := domain.Shared{
		FileId:  fileID,
		UserIds: make([]string, 0, 10),
	}

	rows, err := r.db.QueryContext(ctx, query, fileID)
	if err != nil {
		log.Println("GetUsersSharedWith query error: ", err)
		return nil, utils.ResponseMsg(utils.ErrCodeDatabaseError, err.Error())
	}
	defer rows.Close()

	for rows.Next() {
		var userid string
		if err := rows.Scan(&userid); err != nil {
			log.Println("GetUsersSharedWith scan error: ", err)
			return nil, utils.ResponseMsg(utils.ErrCodeDatabaseError, err.Error())
		}
		share.UserIds = append(share.UserIds, userid)
	}

	if err := rows.Err(); err != nil {
		return nil, utils.ResponseMsg(utils.ErrCodeDatabaseError, err.Error())
	}

	return &share, nil
}
