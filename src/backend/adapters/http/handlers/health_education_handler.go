package handlers

import (
	"errors"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"saludconecta-backend/core/domain"
	"saludconecta-backend/core/ports"
)

type HealthEducationHandler struct {
	service ports.HealthEducationService
}

// NewHealthEducationHandler construye el controlador HTTP para el muro de concientización y salud.
func NewHealthEducationHandler(service ports.HealthEducationService) *HealthEducationHandler {
	return &HealthEducationHandler{service: service}
}

// ListPosts maneja la consulta de publicaciones con filtro opcional de categoría.
func (h *HealthEducationHandler) ListPosts(c *fiber.Ctx) error {
	category := c.Query("category")
	posts, err := h.service.ListPosts(c.Context(), category)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al consultar las publicaciones de concientización en salud",
		})
	}
	if posts == nil {
		posts = []domain.HealthEducationPost{}
	}
	return c.JSON(posts)
}

// GetPost maneja la consulta individual de un artículo o tarjeta.
func (h *HealthEducationHandler) GetPost(c *fiber.Ctx) error {
	id := c.Params("id")
	post, err := h.service.GetPostByID(c.Context(), id)
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al consultar la publicación",
		})
	}
	if post == nil {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{
			"error": "Publicación educativa no encontrada",
		})
	}
	return c.JSON(post)
}

func getUserFromContext(c *fiber.Ctx) *domain.User {
	if u, ok := c.Locals("user").(*domain.User); ok && u != nil {
		return u
	}
	userID, okID := c.Locals("user_id").(string)
	if !okID || userID == "" {
		return nil
	}
	role, _ := c.Locals("role").(string)
	email, _ := c.Locals("email").(string)
	return &domain.User{
		ID:               userID,
		RoleName:         role,
		Email:            email,
		ProfessionalCard: "RM-ASISTENCIAL",
	}
}

// CreatePost maneja la publicación de una nueva tarjeta en el muro por parte de un médico.
func (h *HealthEducationHandler) CreatePost(c *fiber.Ctx) error {
	user := getUserFromContext(c)
	if user == nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Sesión no autenticada",
		})
	}

	var req domain.HealthEducationPost
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Cuerpo de solicitud JSON inválido",
		})
	}

	created, err := h.service.CreatePost(c.Context(), user, &req)
	if err != nil {
		if errors.Is(err, domain.ErrUnauthorizedRole) {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso restringido: Solo el personal médico habilitado puede publicar información en el muro asistencial",
			})
		}
		if errors.Is(err, domain.ErrInvalidPostTitle) ||
			errors.Is(err, domain.ErrInvalidPostCategory) ||
			errors.Is(err, domain.ErrInvalidPostContent) ||
			errors.Is(err, domain.ErrVideoDurationTooLong) {
			return c.Status(http.StatusUnprocessableEntity).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error interno al guardar la publicación de salud",
		})
	}

	return c.Status(http.StatusCreated).JSON(created)
}

// UpdatePost maneja la edición de una publicación existente.
func (h *HealthEducationHandler) UpdatePost(c *fiber.Ctx) error {
	user := getUserFromContext(c)
	if user == nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Sesión no autenticada",
		})
	}

	id := c.Params("id")
	var req domain.HealthEducationPost
	if err := c.BodyParser(&req); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{
			"error": "Cuerpo de solicitud JSON inválido",
		})
	}

	updated, err := h.service.UpdatePost(c.Context(), user, id, &req)
	if err != nil {
		if errors.Is(err, domain.ErrUnauthorizedRole) {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso restringido: Solo el personal médico habilitado puede modificar publicaciones",
			})
		}
		if errors.Is(err, domain.ErrPostNotFound) {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{
				"error": "Publicación no encontrada",
			})
		}
		if errors.Is(err, domain.ErrInvalidPostTitle) ||
			errors.Is(err, domain.ErrInvalidPostCategory) ||
			errors.Is(err, domain.ErrInvalidPostContent) ||
			errors.Is(err, domain.ErrVideoDurationTooLong) {
			return c.Status(http.StatusUnprocessableEntity).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error interno al actualizar la publicación",
		})
	}

	return c.JSON(updated)
}

// DeletePost maneja la eliminación de una tarjeta del muro.
func (h *HealthEducationHandler) DeletePost(c *fiber.Ctx) error {
	user := getUserFromContext(c)
	if user == nil {
		return c.Status(http.StatusUnauthorized).JSON(fiber.Map{
			"error": "Sesión no autenticada",
		})
	}

	id := c.Params("id")
	err := h.service.DeletePost(c.Context(), user, id)
	if err != nil {
		if errors.Is(err, domain.ErrUnauthorizedRole) {
			return c.Status(http.StatusForbidden).JSON(fiber.Map{
				"error": "Acceso restringido: Solo el personal médico puede eliminar publicaciones",
			})
		}
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al eliminar la publicación",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Publicación eliminada correctamente",
		"id":      id,
	})
}

