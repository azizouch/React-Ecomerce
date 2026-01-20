import { Star, ShoppingCart } from "lucide-react";
import useCart from "@/utils/useCart";

export default function ProductCard({ product }) {
  const addItem = useCart((state) => state.addItem);

  const handleAddToCart = (e) => {
    e.preventDefault();
    addItem(product, 1);
  };

  const discount = product.compare_at_price
    ? Math.round(
        ((product.compare_at_price - product.price) /
          product.compare_at_price) *
          100,
      )
    : 0;

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={
            product.images?.[0] ||
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"
          }
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-lg text-sm font-bold">
            -{discount}%
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {product.title}
        </h3>

        <div className="flex items-center gap-1 mb-2">
          <Star size={16} className="fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium text-gray-700">
            {product.rating || 0}
          </span>
          <span className="text-sm text-gray-500">
            ({product.review_count || 0})
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900">
                ${product.price}
              </span>
              {product.compare_at_price && (
                <span className="text-sm text-gray-500 line-through">
                  ${product.compare_at_price}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart size={20} />
          </button>
        </div>
      </div>
    </a>
  );
}
