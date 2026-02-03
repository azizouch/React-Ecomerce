import { Star, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { memo, useState } from "react";
import LazyImage from "./ui/LazyImage";
import AddToCartModal from "./ui/AddToCartModal";

const ProductCard = memo(function ProductCard({ product, onAddToCart }) {
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // open modal to choose color/size
    setModalOpen(true);
  };

  const handleClick = () => {
    navigate(`/product/${product.id}`);
  };

  return (
    <button
      onClick={handleClick}
      className="group block w-full bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-slate-700 text-left hover:scale-105 transform"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-slate-700">
        <LazyImage
          src={product.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold text-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-3">
          <Star size={14} className="fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            4.5
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (128)
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              ${product.price}
            </span>
          </div>

          <>
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="p-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            <ShoppingCart size={18} />
          </button>
          <AddToCartModal productId={product.id} open={modalOpen} onClose={() => setModalOpen(false)} />
          </>
        </div>
      </div>
    </button>
  );
});

export default ProductCard;
