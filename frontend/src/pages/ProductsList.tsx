import { Link } from 'react-router-dom';
import ProductsListComponent from '../components/ProductsList';
import './ProductsList.css';

export default function ProductsList() {
  return (
    <div className="products-list-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <span className="page-icon">📦</span>
            Products Catalog
          </h1>
          <p className="page-subtitle">
            Manage and view all your digital product passports
          </p>
        </div>
        <div className="header-actions">
          <Link to="/create-dpp" className="btn-create-product">
            <span>➕</span>
            Create New Product
          </Link>
        </div>
      </div>
      
      <ProductsListComponent />
    </div>
  );
}
