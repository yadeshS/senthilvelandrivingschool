'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles').select('full_name, role').eq('id', session.user.id).single();
      if (!profile) { await supabase.auth.signOut(); router.replace('/login'); return; }
      setName(profile.full_name || '');
      setRole(profile.role);
      // Enforce MFA (AAL2) for staff and owner
      if (profile.role === 'staff' || profile.role === 'owner') {
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel !== 'aal2') {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const hasVerified = factors?.totp?.some(f => f.status === 'verified');
          window.location.href = hasVerified ? '/mfa/verify' : '/mfa/setup';
          return;
        }
      }
      // Route to correct section by role
      if (profile.role === 'staff' || profile.role === 'owner' || profile.role === 'driver') {
        if (!pathname.startsWith('/portal/staff')) router.replace('/portal/staff');
      } else if (profile.role === 'customer') {
        if (pathname.startsWith('/portal/staff')) router.replace('/portal');
      }
      setChecking(false);
    });
  }, [router, pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const isStaff = role === 'staff' || role === 'owner' || role === 'driver';
  const isOwner = role === 'owner';

  return (
    <>
      <nav className="portal-nav">
        <a href="/" className="portal-nav-brand">
          <div className="portal-nav-logo">SV</div>
          <span>Senthil Velan</span>
        </a>
        {isStaff && (
          <div className="portal-staff-nav">
            <a href="/portal/staff" className={pathname === '/portal/staff' ? 'active' : ''}>Dashboard</a>
            <a href="/portal/staff/bookings" className={pathname === '/portal/staff/bookings' ? 'active' : ''}>Bookings</a>
            <a href="/portal/staff/records" className={pathname.startsWith('/portal/staff/records') ? 'active' : ''}>Records</a>
            <a href="/portal/staff/customers" className={pathname === '/portal/staff/customers' ? 'active' : ''}>App Users</a>
            {isOwner && (
              <a href="/portal/staff/team" className={pathname.startsWith('/portal/staff/team') ? 'active' : ''}>Team</a>
            )}
          </div>
        )}
        <div className="portal-nav-right">
          <span className="portal-nav-name">
            {isStaff ? '🏢' : '👤'} {name}
          </span>
          <button className="portal-nav-logout" onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <main className="portal-main">{children}</main>
    </>
  );
}
