package repository

import (
	"database/sql"
	"strings"

	"github.com/lib/pq"
	"github.com/ndkhoi13505/File-Sharing-Application/internal/domain"
	"github.com/ndkhoi13505/File-Sharing-Application/pkg/utils"
)

type SQLUserRepository struct {
	db *sql.DB
}

func NewSQLUserRepository(DB *sql.DB) UserRepository {
	return &SQLUserRepository{
		db: DB,
	}
}

func (ur *SQLUserRepository) FindById(id string, user *domain.User) *utils.ReturnStatus {
	row := ur.db.QueryRow("SELECT * FROM users WHERE id = $1", id)
	err := row.Scan(&user.Id, &user.Username, &user.Password, &user.Email, &user.Role, &user.EnableTOTP, &user.SecretTOTP)

	if err != nil {
		return utils.ErrIfExists(utils.ErrCodeInternal, err)
	}

	return nil
}

func (ur *SQLUserRepository) FindByEmail(email string, user *domain.User) *utils.ReturnStatus {
	row := ur.db.QueryRow("SELECT * FROM users WHERE email = $1", email)
	err := row.Scan(&user.Id, &user.Username, &user.Password, &user.Email, &user.Role, &user.EnableTOTP, &user.SecretTOTP)
	if err != nil {
		return utils.ErrIfExists(utils.ErrCodeInternal, err)
	}

	return nil
}

func (ur *SQLUserRepository) FindByCId(cid string, user *domain.UsersLoginSession) *utils.ReturnStatus {
	row := ur.db.QueryRow("SELECT * FROM usersloginsession WHERE cid = $1", cid)
	err := row.Scan(&user.Id, &user.Cid)
	if err != nil {
		return utils.ErrIfExists(utils.ErrCodeInternal, err)
	}

	return nil
}

func (ur *SQLUserRepository) AddTimestamp(id string, cid string) *utils.ReturnStatus {
	_, err := ur.db.Exec(`
		INSERT INTO usersLoginSession (id, cid)
		VALUES ($1, $2)
		ON CONFLICT (id) DO UPDATE 
		SET cid = EXCLUDED.cid
	`, id, cid)

	return utils.ErrIfExists(utils.ErrCodeDatabaseError, err)
}

func (ur *SQLUserRepository) DeleteTimestamp(id string) *utils.ReturnStatus {
	_, err := ur.db.Exec(`
		DELETE FROM usersLoginSession
		WHERE id = $1
	`, id)

	return utils.ErrIfExists(utils.ErrCodeDatabaseError, err)
}

func (ur *SQLUserRepository) FindNonExistingEmails(emails []string) ([]string, *utils.ReturnStatus) {
	if len(emails) == 0 {
		return nil, nil
	}

	cleanEmails := make([]string, 0, len(emails))
	for _, e := range emails {
		trimmed := strings.ToLower(strings.TrimSpace(e))
		if trimmed != "" {
			cleanEmails = append(cleanEmails, trimmed)
		}
	}

	if len(cleanEmails) == 0 {
		return nil, nil
	}

	query := "SELECT LOWER(email) FROM users WHERE LOWER(email) = ANY($1)"
	rows, err := ur.db.Query(query, pq.Array(cleanEmails))
	if err != nil {
		return nil, utils.ErrIfExists(utils.ErrCodeDatabaseError, err)
	}
	defer rows.Close()

	existingMap := make(map[string]bool)
	for rows.Next() {
		var email string
		if err := rows.Scan(&email); err == nil {
			existingMap[email] = true
		}
	}

	if err := rows.Err(); err != nil {
		return nil, utils.ErrIfExists(utils.ErrCodeDatabaseError, err)
	}

	var missingEmails []string
	for _, email := range cleanEmails {
		if !existingMap[email] {
			missingEmails = append(missingEmails, email)
		}
	}

	return missingEmails, nil
}
