import Layout from "./Layout.jsx";
import Home from "./Home";
import Lab from "./Lab";
import Dashboard from "./Dashboard";
import AdminDashboard from "./AdminDashboard";
import AdminNotifications from "./AdminNotifications";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

import { Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Home: Home,
    Lab: Lab,
    Dashboard: Dashboard,
    AdminDashboard: AdminDashboard,
    AdminNotifications: AdminNotifications,
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                <Route path="/" element={<Dashboard />} />
                <Route path="/Home" element={<Dashboard />} />
                <Route path="/Lab" element={<Lab />} />
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/AdminDashboard" element={
                    <ProtectedRoute adminOnly>
                        <AdminDashboard />
                    </ProtectedRoute>
                } />
                
                <Route path="/AdminNotifications" element={
                    <ProtectedRoute adminOnly>
                        <AdminNotifications />
                    </ProtectedRoute>
                } />
            </Routes>
        </Layout>
    );
}

export default PagesContent;
