import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [cropPreview, setCropPreview] = useState<string>('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string>('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const metadataAvatar = (user?.user_metadata?.avatar_url as string | undefined) || '';
    setLocalAvatarUrl(metadataAvatar);
  }, [user?.id, user?.user_metadata?.avatar_url]);

  useEffect(() => {
    let cancelled = false;

    const updatePreview = async () => {
      if (!sourceImage || !imageSize || !cropOpen) return;
      const preview = await getCroppedImage(sourceImage, imageSize, zoom, offsetX, offsetY, 320);
      if (!cancelled) setCropPreview(preview);
    };

    updatePreview();
    return () => {
      cancelled = true;
    };
  }, [sourceImage, imageSize, zoom, offsetX, offsetY, cropOpen]);

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Group Tours', path: '/packages' },
    { name: 'Packages', path: '/packages' },
    { name: 'India', path: '/packages' },
    { name: 'Honeymoon', path: '/packages' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
    { name: 'About', path: '/about' },
  ];

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';
  const avatarUrl = localAvatarUrl || (user?.user_metadata?.avatar_url as string | undefined) || '';

  const resetCropState = () => {
    setCropOpen(false);
    setSourceImage(null);
    setImageSize(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setCropPreview('');
  };

  const onChoosePhoto = () => {
    setProfileMessage('');
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileMessage('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;

      const img = new Image();
      img.onload = () => {
        setSourceImage(result);
        setImageSize({ width: img.width, height: img.height });
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
        setCropOpen(true);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);

    e.currentTarget.value = '';
  };

  const onSaveAvatar = async () => {
    if (!sourceImage || !imageSize || !user) return;

    setAvatarSaving(true);
    setProfileMessage('');
    try {
      const avatarDataUrl = await getCroppedImage(sourceImage, imageSize, zoom, offsetX, offsetY, 256);
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: avatarDataUrl },
      });

      if (error) {
        setProfileMessage(error.message || 'Unable to save profile photo.');
        return;
      }

      setLocalAvatarUrl(avatarDataUrl);
      setProfileMessage('Profile photo updated.');
      resetCropState();
    } finally {
      setAvatarSaving(false);
    }
  };

  const cropSize = imageSize ? Math.min(imageSize.width, imageSize.height) / zoom : 0;
  const maxOffsetX = imageSize ? Math.max(0, (imageSize.width - cropSize) / 2) : 0;
  const maxOffsetY = imageSize ? Math.max(0, (imageSize.height - cropSize) / 2) : 0;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />

      <nav
        className={`nav-container transition-all duration-300 ${
          user
            ? 'bg-gradient-to-r from-[#0f2027] via-[#203a43] to-[#2c5364] shadow-lg'
            : ''
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--cyan-accent))]" />
          <span className="text-lg font-bold text-white">
            Travel
            <span className="text-[hsl(var(--cyan-accent))]">Mate</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-colors ${
                user
                  ? 'text-white/90 hover:text-[hsl(var(--cyan-accent))]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Auth Section */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center text-sm font-bold text-white hover:bg-sky-400 transition overflow-hidden"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    userInitial
                  )}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#2b2836] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-xs text-gray-400">Signed in as</p>
                      <p className="text-sm text-white truncate">{user.email}</p>
                      {user.user_metadata?.full_name && (
                        <p className="text-xs text-gray-400 truncate mt-1">{user.user_metadata.full_name}</p>
                      )}
                    </div>
                    <button
                      onClick={onChoosePhoto}
                      className="w-full text-left px-4 py-3 text-sm text-sky-300 hover:bg-white/5 transition"
                    >
                      Change profile photo
                    </button>
                    {profileMessage && (
                      <p className="px-4 pb-2 text-xs text-sky-300">{profileMessage}</p>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition border-t border-white/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-[hsl(var(--cyan-accent))] text-[hsl(220,25%,12%)] px-6 py-2 rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Login
              </Link>
            )}
          </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Menu className="h-6 w-6 text-white" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-white/10">
            <div className="flex flex-col gap-4 px-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-white/80 hover:text-[hsl(var(--cyan-accent))] font-medium transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}

              {user ? (
                <div className="border-t border-white/10 pt-4 mt-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        userInitial
                      )}
                    </div>
                    <span className="text-sm text-white truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={onChoosePhoto}
                    className="text-sky-300 text-sm hover:text-sky-200 transition mb-3"
                  >
                    Change profile photo
                  </button>
                  {profileMessage && <p className="text-xs text-sky-300 mb-3">{profileMessage}</p>}
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 text-red-400 text-sm hover:text-red-300 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-[hsl(var(--cyan-accent))] text-[hsl(220,25%,12%)] px-6 py-2 rounded-full font-medium text-sm text-center hover:opacity-90 transition-opacity"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {cropOpen && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#211f2b] border border-white/10 rounded-2xl p-5 text-white">
            <h3 className="text-lg font-semibold mb-3">Crop profile photo</h3>
            <div className="w-56 h-56 mx-auto rounded-xl overflow-hidden bg-black/30 border border-white/10">
              {cropPreview ? (
                <img src={cropPreview} alt="Crop preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Loading preview...</div>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm text-gray-300">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </label>
              <label className="block text-sm text-gray-300">
                Horizontal
                <input
                  type="range"
                  min={-maxOffsetX}
                  max={maxOffsetX}
                  step={1}
                  value={offsetX}
                  onChange={(e) => setOffsetX(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </label>
              <label className="block text-sm text-gray-300">
                Vertical
                <input
                  type="range"
                  min={-maxOffsetY}
                  max={maxOffsetY}
                  step={1}
                  value={offsetY}
                  onChange={(e) => setOffsetY(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetCropState}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveAvatar}
                disabled={avatarSaving}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 transition disabled:opacity-60"
              >
                {avatarSaving ? 'Saving...' : 'Save photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;

async function getCroppedImage(
  imageSrc: string,
  imageSize: { width: number; height: number },
  zoom: number,
  offsetX: number,
  offsetY: number,
  outputSize: number
) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const cropSize = Math.min(imageSize.width, imageSize.height) / zoom;
  const maxX = Math.max(0, (imageSize.width - cropSize) / 2);
  const maxY = Math.max(0, (imageSize.height - cropSize) / 2);

  const safeOffsetX = clamp(offsetX, -maxX, maxX);
  const safeOffsetY = clamp(offsetY, -maxY, maxY);

  const centerX = imageSize.width / 2 + safeOffsetX;
  const centerY = imageSize.height / 2 + safeOffsetY;

  const sx = clamp(centerX - cropSize / 2, 0, imageSize.width - cropSize);
  const sy = clamp(centerY - cropSize / 2, 0, imageSize.height - cropSize);

  ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);
  return canvas.toDataURL('image/jpeg', 0.9);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
