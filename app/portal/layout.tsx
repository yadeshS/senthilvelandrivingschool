'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      const { data: profile } = await supabase
        .from('profiles').select('full_name, role').eq('id', session.user.id).single();
      if (!profile) { await supabase.auth.signOut(); router.replace('/login'); return; }
      setName(profile.full_name || '');
      setRole(profile.role);
      // Route staff to staff section, customers to customer section
      if (profile.role === 'staff' || profile.role === 'owner') {
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

  const isStaff = role === 'staff' || role === 'owner';

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
