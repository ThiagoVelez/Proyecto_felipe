// Package retention borra copias locales de documentos con datos de pacientes cuando superan su plazo (DEF-62).
package retention

import (
	"os"
	"path/filepath"
	"time"
)

// DefaultMaxAge es el plazo de conservacion por defecto de PDF y correos locales.
const DefaultMaxAge = 30 * 24 * time.Hour

// PurgeOlderThan borra los archivos regulares de dir (y sus subcarpetas) modificados antes de now-maxAge.
// No sigue enlaces simbolicos. Retorna cuantos archivos borro; una carpeta inexistente no es un error.
func PurgeOlderThan(dir string, maxAge time.Duration, now time.Time) (int, error) {
	if maxAge <= 0 {
		return 0, nil
	}
	return purgeDir(dir, now.Add(-maxAge))
}

func purgeDir(dir string, limit time.Time) (int, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}
	removed := 0
	for _, entry := range entries {
		path := filepath.Join(dir, entry.Name())
		switch {
		case entry.IsDir():
			n, err := purgeDir(path, limit)
			removed += n
			if err != nil {
				return removed, err
			}
		case entry.Type().IsRegular():
			info, err := entry.Info()
			if err == nil && info.ModTime().Before(limit) && os.Remove(path) == nil {
				removed++
			}
		}
	}
	return removed, nil
}
