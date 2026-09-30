import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastContainer } from "react-toastify";

// Layout Components
import Navbar from "./components/Layout/Navbar";
import Sidebar from "./components/Layout/Sidebar";
import SearchOverlay from "./components/Layout/SearchOverlay";
import CartSidebar from "./components/Layout/CartSidebar";
import ProfilePanel from "./components/Layout/ProfilePanel";
import LoginModal from "./components/Layout/LoginModal";
import AISearchModal from "./components/Products/AISearchModal.jsx";
import Footer from "./components/Layout/Footer";

// Pages
import Index from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails";
import Payment from "./pages/Payment";
import About from "./pages/About";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.jsx"));
import { getUser } from "./store/slices/authSlice.js";

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getUser());
  }, [dispatch]);

  return (
    <>
      <ThemeProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Navbar />
            <Sidebar />
            <SearchOverlay />
            <CartSidebar />
            <ProfilePanel />
            <LoginModal />
            <AISearchModal />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/password/reset/:token" element={<ResetPassword />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:orderId" element={<OrderDetails />} />
              <Route path="/admin" element={<Suspense fallback={<main className="min-h-[70vh] px-4 pb-16 pt-28"><div className="mx-auto max-w-7xl animate-pulse space-y-5"><div className="h-12 w-1/3 rounded-xl bg-secondary" /><div className="h-72 rounded-2xl bg-secondary" /></div></main>}><AdminDashboard /></Suspense>} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Footer />
          </div>
          <ToastContainer />
        </BrowserRouter>
      </ThemeProvider>
    </>
  );
};

export default App;
