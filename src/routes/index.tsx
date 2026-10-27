import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Dashboard } from '../pages/Dashboard';
import { Processor } from '../pages/Processor';
import { AnalysisTool } from '../pages/AnalysisTool';
import { About } from '../pages/About';
import { VerifyEmail } from '../pages/VerifyEmail';
import { ResetPassword } from '../pages/ResetPassword';
import { Layout } from '../components/Layout';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<About />} />

        <Route path="/processor" element={<Processor />} />
        <Route path="/analysis" element={<AnalysisTool />} />

      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
