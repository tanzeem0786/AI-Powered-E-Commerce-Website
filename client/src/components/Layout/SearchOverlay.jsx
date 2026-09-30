import { useState } from "react";
import { X, Search } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toggleSearchBar } from "../../store/slices/popupSlice";

const SearchOverlay = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isSearchBarOpen } = useSelector((state) => state.popup);
  if (!isSearchBarOpen) return null;

  const handleSearch = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery !== "") {
      dispatch(toggleSearchBar());
      navigate(`/products?search=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  return <>
    <div className="fixed inset-0 z-50">
      {/* GLASS BACKGROUND */}
      <div className="absolute inset-0 backdrop-blur-md bg-[hsla(var(--glass-bg))]">
        {/* SEARCH CONTAINER  */}
        <div className="relative z-10 animate-slide-in-top">
          <div className="glass-panel m-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-primary">Search Products</h2>
              <button onClick={() => dispatch(toggleSearchBar())} className="p-2 rounded-lg glass-card hover:glow-on-hover animate-smoother">
                <X className="w-5 h-5 text-primary"/>
              </button>
            </div>

            <div className="relative">
              {/* SEARCH ICON BUTTON  */}
              <button onClick={handleSearch} className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground z-10">
                <Search className="w-5 h-5 text-primary"/>
              </button>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                autoFocus
                placeholder="Search products..."
                className="w-full rounded-lg glass-card py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

                <div>
                  <p className="mt-6">Start typing to Search for Products</p>
                </div>

          </div>
        </div>
      </div>
    </div>
  </>;
};

export default SearchOverlay;
