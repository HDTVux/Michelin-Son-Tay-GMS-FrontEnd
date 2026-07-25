import React, { useEffect } from 'react';
import { checkAndRunFirstTimeStaffOnboarding } from '../../pages/Docs/utils/driverTourUtils.js';

export default function UserTour() {
  useEffect(() => {
    checkAndRunFirstTimeStaffOnboarding();
  }, []);

  return null;
}
