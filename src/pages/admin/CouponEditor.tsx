import axios from 'axios';
import dayjs from 'dayjs';
import { useState, type FormEvent } from 'react';
import { ButtonSpinner } from '../../components/PageStatus';
import { useAction } from '../../hooks/useAction';
import { useToast } from '../../hooks/useToast';
import type { Coupon } from '../../types/store';

interface CouponEditorProps {
  // Null when adding a new coupon
  coupon: Coupon | null;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}

export function CouponEditor({ coupon, onSaved, onCancel }: CouponEditorProps) {
  const [code, setCode] = useState(coupon?.code ?? '');
  const [percentOff, setPercentOff] = useState(coupon ? String(coupon.percentOff) : '');
  const [expiryDate, setExpiryDate] = useState(coupon?.expiresAt ? dayjs(coupon.expiresAt).format('YYYY-MM-DD') : '');
  const [active, setActive] = useState(coupon?.active ?? true);
  const showToast = useToast();

  const [save, isSaving] = useAction(async () => {
    const fields = {
      code,
      percentOff: Number(percentOff),
      // A coupon works until the end of its last day
      expiresAt: expiryDate ? dayjs(expiryDate).endOf('day').toISOString() : null,
      active
    };
    if (coupon) {
      await axios.put(`/api/admin/coupons/${coupon.id}`, fields);
    } else {
      await axios.post('/api/admin/coupons', fields);
    }
    await onSaved();
    showToast(`Coupon ${code.trim().toUpperCase()} saved`);
  });

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save();
  };

  const title = coupon ? 'Edit coupon' : 'Add a coupon';

  return (
    <form className="admin-form card" onSubmit={submitForm} aria-label={title} data-testid="admin-coupon-form">
      <h3 className="admin-form-title">{title}</h3>

      <div className="admin-form-row">
        <label className="form-field">
          Code
          <input type="text" required pattern="[A-Za-z0-9]{3,20}" title="3 to 20 letters or digits"
            autoFocus value={code} onChange={(event) => setCode(event.target.value)}
            data-testid="admin-coupon-code-input" />
        </label>

        <label className="form-field">
          Percent off
          <input type="number" required min="1" max="90" step="1" inputMode="numeric" value={percentOff}
            onChange={(event) => setPercentOff(event.target.value)}
            data-testid="admin-coupon-percent-input" />
        </label>

        <label className="form-field">
          Expires after
          <input type="date" value={expiryDate} aria-describedby="admin-coupon-expiry-hint"
            onChange={(event) => setExpiryDate(event.target.value)}
            data-testid="admin-coupon-expiry-input" />
          <span id="admin-coupon-expiry-hint" className="admin-hint">Empty for no end date</span>
        </label>
      </div>

      <label className="admin-checkbox">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)}
          data-testid="admin-coupon-active-input" />
        Active, so customers can use it
      </label>

      <div className="admin-form-actions">
        <button className="button-primary" type="submit" disabled={isSaving}
          data-testid="admin-coupon-save-button">
          {isSaving && <ButtonSpinner />}
          {coupon ? 'Save changes' : 'Add coupon'}
        </button>
        <button className="button-secondary" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
