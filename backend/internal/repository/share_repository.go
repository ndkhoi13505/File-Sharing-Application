package repository

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"

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

	// 1. Tạo Query động an toàn với Prepared Arguments ($1, $2, ...)
	placeholders := make([]string, len(emails))
	args := make([]interface{}, len(emails))
	for i, e := range emails {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = e
	}

	userIDQuery := fmt.Sprintf(`SELECT id FROM users WHERE email IN (%s);`, strings.Join(placeholders, ", "))

	rows, err := r.db.QueryContext(ctx, userIDQuery, args...)
	if err != nil {
		log.Println("🔥 Lỗi query User ID từ Email:", err)
		return utils.ResponseMsg(utils.ErrCodeDatabaseError, err.Error())
	}
	defer rows.Close()

	var userIDs []string
	for rows.Next() {
		var uid string
		if err := rows.Scan(&uid); err != nil {
			log.Println("🔥 Lỗi scan User ID:", err)
			return utils.ResponseMsg(utils.ErrCodeDatabaseError, err.Error())
		}
		userIDs = append(userIDs, uid)
	}

	// Nếu không tìm thấy User ID nào tương ứng với Email đã nhập
	if len(userIDs) == 0 {
		log.Println("⚠️ Không tìm thấy người dùng nào phù hợp với danh sách Email cung cấp.")
		return nil
	}

	// 2. Thêm vào bảng shared bằng parameterized insert
	valueStrings := make([]string, 0, len(userIDs))
	valueArgs := make([]interface{}, 0, len(userIDs)*2)
	
	argPos := 1
	for _, uid := range userIDs {
		valueStrings = append(valueStrings, fmt.Sprintf("($%d, $%d)", argPos, argPos+1))
		valueArgs = append(valueArgs, uid, fileID)
		argPos += 2
	}

	insertQuery := fmt.Sprintf(`
		INSERT INTO shared (user_id, file_id)
		VALUES %s
		ON CONFLICT (user_id, file_id) DO NOTHING
	`, strings.Join(valueStrings, ", "))

	if _, err := r.db.ExecContext(ctx, insertQuery, valueArgs...); err != nil {
		log.Println("🔥 Lỗi INSERT vào bảng shared:", err)
		return utils.ResponseMsg(utils.ErrCodeDatabaseError, err.Error())
	}

	log.Println("✅ Chia sẻ file thành công vào Database!")
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
		log.Println(err)
		return nil, utils.ResponseMsg(utils.ErrCodeDatabaseError, err.Error())
	}
	defer rows.Close()

	for rows.Next() {
		var userid_tmp string
		if err := rows.Scan(&userid_tmp); err != nil {
			log.Println(err)
			return nil, utils.ResponseMsg(utils.ErrCodeDatabaseError, err.Error())
		}
		share.UserIds = append(share.UserIds, userid_tmp)
	}

	return &share, nil
}