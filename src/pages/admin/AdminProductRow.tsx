import axios from 'axios';
import { useState } from 'react';
import { ButtonSpinner } from '../../components/PageStatus';
import { useAction } from '../../hooks/useAction';
import { formatMoney } from '../../utils/money';
import type { Product } from '../../types/store';

interface AdminProductRowProps {
  product: Product;
  onEdit: () => void;
  onDeleted: () => Promise<void>;
}

export function AdminProductRow({ product, onEdit, onDeleted }: AdminProductRowProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [deleteProduct, isDeleting] = useAction(async () => {
    await axios.delete(`/api/admin/products/${product.id}`);
    await onDeleted();
  });

  return (
    <tr data-testid="admin-product-row">
      <td className="admin-cell-image">
        <img className="product-thumbnail" src={product.image} alt="" width="480" height="480" loading="lazy" />
      </td>
      <td className="admin-cell-name">{product.name}</td>
      <td className="admin-cell-price">{formatMoney(product.priceCents)}</td>
      <td className="admin-cell-category">{product.category}</td>
      <td className="admin-cell-keywords">{product.keywords?.join(', ')}</td>
      <td className="admin-cell-actions">
        {/* The keys swap in new buttons, so a double click on Delete can't also confirm it */}
        {isConfirmingDelete ? (
          <div key="confirm" className="admin-actions" role="group" aria-label={`Delete ${product.name}?`}>
            <span className="admin-confirm-text">Delete it from the store?</span>
            <button className="button-danger" type="button" disabled={isDeleting} onClick={deleteProduct}
              data-testid="admin-confirm-delete-button">
              {isDeleting && <ButtonSpinner />}
              Delete
            </button>
            <button className="button-secondary" type="button" disabled={isDeleting} autoFocus
              onClick={() => setIsConfirmingDelete(false)}>
              Keep
            </button>
          </div>
        ) : (
          <div key="actions" className="admin-actions">
            <button className="button-secondary" type="button" onClick={onEdit}
              aria-label={`Edit ${product.name}`} data-testid="admin-edit-button">
              Edit
            </button>
            <button className="button-secondary" type="button" onClick={() => setIsConfirmingDelete(true)}
              aria-label={`Delete ${product.name}`} data-testid="admin-delete-button">
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
