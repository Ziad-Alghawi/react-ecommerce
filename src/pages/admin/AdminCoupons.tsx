import { useState } from 'react';
import { CouponEditor } from './CouponEditor';
import { formatDate } from '../../utils/date';
import type { Coupon } from '../../types/store';

function getCouponStatus(coupon: Coupon) {
  if (!coupon.active) {
    return 'Off';
  }
  return coupon.expiresAt && new Date(coupon.expiresAt) <= new Date() ? 'Expired' : 'Active';
}

interface AdminCouponsProps {
  coupons: Coupon[];
  loadCoupons: () => Promise<void>;
}

export function AdminCoupons({ coupons, loadCoupons }: AdminCouponsProps) {
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);

  const closeEditorAfterSaving = async () => {
    await loadCoupons();
    setEditing(null);
  };

  return (
    <section className="admin-section" aria-labelledby="admin-coupons-title">
      <div className="admin-heading">
        <h2 id="admin-coupons-title" className="admin-section-title">Coupons</h2>
        {!editing && (
          <button className="button-primary" type="button" onClick={() => setEditing('new')}
            data-testid="admin-add-coupon-button">
            Add coupon
          </button>
        )}
      </div>

      {editing && (
        <CouponEditor key={editing === 'new' ? 'new' : editing.id} coupon={editing === 'new' ? null : editing}
          onSaved={closeEditorAfterSaving} onCancel={() => setEditing(null)} />
      )}

      <div className="admin-table-container card">
        <table className="admin-table admin-coupons-table">
          <caption className="admin-caption">
            {coupons.length} {coupons.length === 1 ? 'coupon' : 'coupons'}. Customers type the code at checkout
          </caption>
          <thead>
            <tr>
              <th scope="col">Code</th>
              <th scope="col">Discount</th>
              <th scope="col">Expires</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => {
              const status = getCouponStatus(coupon);
              return (
                <tr key={coupon.id} data-testid="admin-coupon-row">
                  <td className="admin-cell-name">{coupon.code}</td>
                  <td>{coupon.percentOff}% off</td>
                  <td>{coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Never'}</td>
                  <td>
                    <span className="admin-statuses">
                      <span className={`admin-status admin-status-${status.toLowerCase()}`}>{status}</span>
                      {coupon.featured && <span className="admin-status admin-status-featured">Featured</span>}
                    </span>
                  </td>
                  <td className="admin-cell-actions">
                    <div className="admin-actions">
                      <button className="button-secondary" type="button" onClick={() => setEditing(coupon)}
                        aria-label={`Edit ${coupon.code}`}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
