import axios from 'axios';
import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Header } from '../../components/Header';
import { PageTitle } from '../../components/PageTitle';
import { ErrorMessage, LoadingMessage } from '../../components/PageStatus';
import { AuthContext } from '../../hooks/useAuth';
import { AdminProductRow } from './AdminProductRow';
import { ProductForm } from './ProductForm';
import type { CartItem, Product } from '../../types/store';
import './AdminPage.css';

type PageStatus = 'loading' | 'ready' | 'failed' | 'forbidden';

interface AdminPageProps {
  cart: CartItem[];
  onRetry: () => void;
}

export function AdminPage({ cart, onRetry }: AdminPageProps) {
  const userId = useContext(AuthContext)?.user?.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const loadProducts = async () => {
    const response = await axios.get<Product[]>('/api/products');
    if (!Array.isArray(response.data)) {
      throw new Error('Unexpected products response');
    }
    setProducts(response.data);
  };

  useEffect(() => {
    if (!userId) {
      return;
    }
    // The API decides who is an admin, so a refused request is how this page finds out
    Promise.all([axios.get<string[]>('/api/admin/images'), axios.get<string[]>('/api/products/categories'), loadProducts()])
      .then(([imagesResponse, categoriesResponse]) => {
        if (!Array.isArray(imagesResponse.data) || !Array.isArray(categoriesResponse.data)) {
          throw new Error('Unexpected images or categories response');
        }
        setImages(imagesResponse.data);
        setCategories(categoriesResponse.data);
        setStatus('ready');
      })
      .catch((error) => {
        const isForbidden = axios.isAxiosError(error) && error.response?.status === 403;
        setStatus(isForbidden ? 'forbidden' : 'failed');
      });
  }, [userId]);

  const closeFormAfterSaving = async () => {
    await loadProducts();
    setEditing(null);
  };

  const removeDeletedProduct = async (product: Product) => {
    if (editing !== 'new' && editing?.id === product.id) {
      setEditing(null);
    }
    await loadProducts();
  };

  let pageContent;

  if (!userId) {
    pageContent = (
      <div className="page-status" data-testid="admin-login-message">
        <div>Log in with an admin account to manage products</div>
        <Link className="page-status-link link-primary" to="/login">Log in</Link>
      </div>
    );
  } else if (status === 'forbidden') {
    pageContent = (
      <div className="page-status" data-testid="admin-forbidden-message">
        <div>This page is only for admins</div>
        <Link className="page-status-link link-primary" to="/">Browse products</Link>
      </div>
    );
  } else if (status === 'failed') {
    pageContent = <ErrorMessage onButtonClick={onRetry} />;
  } else if (status === 'loading') {
    pageContent = <LoadingMessage />;
  } else {
    pageContent = (
      <>
        <div className="admin-heading">
          <h1 className="page-title">Manage products</h1>
          {!editing && (
            <button className="button-primary" type="button" onClick={() => setEditing('new')}
              data-testid="admin-add-button">
              Add product
            </button>
          )}
        </div>

        {editing && (
          <ProductForm key={editing === 'new' ? 'new' : editing.id}
            product={editing === 'new' ? null : editing} images={images} categories={categories}
            onSaved={closeFormAfterSaving} onCancel={() => setEditing(null)} />
        )}

        <div className="admin-table-container card">
          <table className="admin-table">
            <caption className="admin-caption">{products.length} products in the store</caption>
            <thead>
              <tr>
                <th scope="col"><span className="visually-hidden">Image</span></th>
                <th scope="col">Name</th>
                <th scope="col">Price</th>
                <th scope="col">Category</th>
                <th scope="col">Keywords</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <AdminProductRow key={product.id} product={product}
                  onEdit={() => setEditing(product)} onDeleted={() => removeDeletedProduct(product)} />
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Manage products" />

      <Header cart={cart} />

      <main className="admin-page page">
        {pageContent}
      </main>
    </>
  );
}
