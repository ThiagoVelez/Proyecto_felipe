package mysql

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"io"
	"testing"
	"time"
)

// Driver de prueba que entrega las columnas como lo hace go-sql-driver/mysql con
// parseTime=true (la configuracion de connection.go): DATE y DATETIME llegan como time.Time.
type fakeInvDriver struct{}
type fakeInvConn struct{}
type fakeInvStmt struct{}
type fakeInvRows struct{ done bool }

var fakeExpiry = time.Date(2027, 12, 31, 0, 0, 0, 0, time.UTC)

func (fakeInvDriver) Open(string) (driver.Conn, error)         { return fakeInvConn{}, nil }
func (fakeInvConn) Prepare(string) (driver.Stmt, error)        { return fakeInvStmt{}, nil }
func (fakeInvConn) Close() error                               { return nil }
func (fakeInvConn) Begin() (driver.Tx, error)                  { return nil, errors.New("sin transacciones") }
func (fakeInvStmt) Close() error                               { return nil }
func (fakeInvStmt) NumInput() int                              { return -1 }
func (fakeInvStmt) Exec([]driver.Value) (driver.Result, error) { return nil, errors.New("no usado") }
func (fakeInvStmt) Query([]driver.Value) (driver.Rows, error)  { return &fakeInvRows{}, nil }
func (*fakeInvRows) Close() error                              { return nil }
func (*fakeInvRows) Columns() []string {
	return []string{"id", "code_cum", "generic_name", "brand_name", "dosage", "presentation",
		"unit_price", "stock_quantity", "min_stock", "batch_number", "expiry_date", "is_active", "created_at", "updated_at"}
}
func (r *fakeInvRows) Next(dest []driver.Value) error {
	if r.done {
		return io.EOF
	}
	r.done = true
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	vals := []driver.Value{"inv-1", "CUM-1", "Amoxicilina", "Amoxal", "500 mg", "Tableta",
		1200.0, int64(10), int64(2), "LOT-1", fakeExpiry, true, now, now}
	copy(dest, vals)
	return nil
}

func init() { sql.Register("fakeinv", fakeInvDriver{}) }

func TestInventoryRepositoryReadsExpiryDate(t *testing.T) {
	db, err := sql.Open("fakeinv", "")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	repo := NewInventoryRepository(db)

	items, err := repo.GetAll(context.Background())
	if err != nil {
		t.Fatalf("GetAll: %v", err)
	}
	if len(items) != 1 || !items[0].ExpiryDate.Equal(fakeExpiry) {
		t.Fatalf("GetAll: vencimiento esperado %s, obtenido %v", fakeExpiry.Format("2006-01-02"), items)
	}

	item, err := repo.GetByID(context.Background(), "inv-1")
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if !item.ExpiryDate.Equal(fakeExpiry) {
		t.Fatalf("GetByID: vencimiento esperado %s, obtenido %s", fakeExpiry.Format("2006-01-02"), item.ExpiryDate.Format("2006-01-02"))
	}
}
