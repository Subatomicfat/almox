import React from 'react';
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger = true, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
