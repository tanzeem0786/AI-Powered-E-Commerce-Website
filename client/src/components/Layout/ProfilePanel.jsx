import { useEffect, useState } from "react";
import { X, LogOut, Upload, Eye, EyeOff, User, Mail, Lock } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { logout, updateProfile, updatePassword } from "../../store/slices/authSlice";
import { toggleAuthPopup } from "../../store/slices/popupSlice";
import { Link } from "react-router-dom";

const ProfilePanel = () => {
  const dispatch = useDispatch();
  const { authUser, isUpdatingProfile, isUpdatingPassword } = useSelector((state) => state.auth);
  const { isAuthPopupOpen } = useSelector((state) => state.popup);

  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (authUser) {
      setFormData({
        name: authUser.name || "",
        email: authUser.email || "",
        phone: authUser.phone || "",
        address: authUser.address || "",
      });
    }
  }, [authUser]);

  if (!isAuthPopupOpen) return null;

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const updateData = new FormData();
    updateData.append("name", formData.name);
    updateData.append("email", formData.email);
    updateData.append("phone", formData.phone);
    updateData.append("address", formData.address);
    if (profileImage) {
      updateData.append("avatar", profileImage);
    }

    try {
      await dispatch(updateProfile(updateData)).unwrap();
      setIsEditingProfile(false);
      setProfileImage(null);
    } catch (error) {
      console.error("Profile update failed:", error);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      await dispatch(
        updatePassword({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
          confirmPassword: passwordData.confirmPassword,
        })
      ).unwrap();

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordFields(false);
      toast.success("Password updated successfully");
    } catch (error) {
      console.error("Password update failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      dispatch(toggleAuthPopup());
      setIsEditingProfile(false);
      setShowPasswordFields(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!authUser) {
    return (
      <>
        {/* OVERLAY */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => dispatch(toggleAuthPopup())} />

        {/* EMPTY STATE */}
        <div className="fixed right-0 top-0 h-full w-96 z-50 glass-panel animate-slide-in-right flex items-center justify-center">
          <div className="text-center p-6">
            <User className="w-12 h-12 text-primary mx-auto mb-4" />
            <p className="text-foreground mb-6">Please log in to view your profile</p>
            <button
              onClick={() => dispatch(toggleAuthPopup())}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* OVERLAY */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => dispatch(toggleAuthPopup())} />

      {/* PROFILE PANEL */}
      <div className="fixed right-0 top-0 h-full w-96 z-50 glass-panel animate-slide-in-right overflow-y-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-[hsla(var(--glass-border))]">
          <h2 className="text-xl font-semibold text-primary">My Profile</h2>
          <button
            onClick={() => {
              dispatch(toggleAuthPopup());
              setIsEditingProfile(false);
              setShowPasswordFields(false);
            }}
            className="p-2 rounded-lg glass-card hover:glow-on-hover animate-smooth"
          >
            <X className="w-5 h-5 text-primary" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* PROFILE SECTION */}
          {!isEditingProfile && !showPasswordFields && (
            <>
              {/* USER INFO */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full glass-card mx-auto mb-4 overflow-hidden flex items-center justify-center">
                  {authUser.avatar ? (
                    <img src={authUser.avatar} alt={authUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground">{authUser.name}</h3>
                <p className="text-sm text-foreground/60">{authUser.email}</p>
                {authUser.phone && <p className="text-sm text-foreground/60">{authUser.phone}</p>}
              </div>

              {/* USER DETAILS */}
              <div className="space-y-3 glass-card p-4 rounded-lg">
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-foreground/70">Email:</span>
                  <span className="text-foreground font-medium">{authUser.email}</span>
                </div>
                {authUser.phone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-foreground/70">Phone:</span>
                    <span className="text-foreground font-medium">{authUser.phone}</span>
                  </div>
                )}
                {authUser.address && (
                  <div className="flex items-start space-x-2 text-sm">
                    <span className="text-foreground/70">Address:</span>
                    <span className="text-foreground font-medium">{authUser.address}</span>
                  </div>
                )}
                {authUser.role && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-foreground/70">Role:</span>
                    <span className="text-foreground font-medium capitalize">{authUser.role}</span>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2">
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setShowPasswordFields(true)}
                  className="w-full px-4 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 transition-opacity font-medium flex items-center justify-center space-x-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Change Password</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>

              {/* QUICK LINKS */}
              <div className="pt-4 border-t border-[hsla(var(--glass-border))] space-y-2">
                <Link
                  to="/orders"
                  onClick={() => dispatch(toggleAuthPopup())}
                  className="block px-4 py-2 glass-card rounded-lg text-foreground hover:text-primary transition-colors text-center font-medium"
                >
                  View Orders
                </Link>
              </div>
            </>
          )}

          {/* EDIT PROFILE FORM */}
          {isEditingProfile && !showPasswordFields && (
            <>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {/* PROFILE IMAGE */}
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full glass-card mx-auto mb-4 overflow-hidden flex items-center justify-center">
                    {profileImage ? (
                      <img src={profileImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : authUser.avatar ? (
                      <img src={authUser.avatar} alt={authUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-primary" />
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center space-x-2 px-3 py-2 glass-card rounded-lg hover:glow-on-hover animate-smooth">
                    <Upload className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">Change Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* NAME */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleProfileChange}
                    placeholder="Your name"
                    className="w-full px-4 py-2 glass-card rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* EMAIL */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleProfileChange}
                    placeholder="Your email"
                    className="w-full px-4 py-2 glass-card rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* PHONE */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleProfileChange}
                    placeholder="Your phone number"
                    className="w-full px-4 py-2 glass-card rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* ADDRESS */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleProfileChange}
                    placeholder="Your address"
                    rows="3"
                    className="w-full px-4 py-2 glass-card rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* FORM BUTTONS */}
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                  >
                    {isUpdatingProfile ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileImage(null);
                      setFormData({
                        name: authUser.name || "",
                        email: authUser.email || "",
                        phone: authUser.phone || "",
                        address: authUser.address || "",
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}

          {/* CHANGE PASSWORD FORM */}
          {showPasswordFields && !isEditingProfile && (
            <>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <p className="text-sm text-foreground/70">Update your password to keep your account secure</p>

                {/* CURRENT PASSWORD */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                      className="w-full px-4 py-2 pr-10 glass-card rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/60 hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* NEW PASSWORD */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                      className="w-full px-4 py-2 pr-10 glass-card rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/60 hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-2 pr-10 glass-card rounded-lg text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-foreground/60 hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* PASSWORD REQUIREMENTS */}
                <div className="text-xs text-foreground/60 space-y-1 bg-secondary/50 p-3 rounded-lg">
                  <p>• Password must be at least 6 characters</p>
                  <p>• Both passwords must match</p>
                </div>

                {/* FORM BUTTONS */}
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
                  >
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordFields(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProfilePanel;