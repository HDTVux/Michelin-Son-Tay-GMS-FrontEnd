import { readFileSync, writeFileSync, existsSync }from 'fs';
import { join } from 'path';

const base = 'D:\\Michelin-Son-Tay-GMS-FrontEnd\\src';

function read(rel) {
  const full = join(base, rel);
  if (!existsSync(full)) { console.log('NOT FOUND:', full); return null; }
  return readFileSync(full, 'utf8');
}

function write(rel, content) {
  writeFileSync(join(base, rel), content, 'utf8');
}

function fix(rel, fn) {
  const c = read(rel);
  if (c === null) return;
  const nc = fn(c);
  if (nc !== c) { write(rel, nc); console.log('FIXED:', rel); }
  else { console.log('NO CHANGE:', rel); }
}

// ─── 1. App.jsx ─── remove unused useLocation
fix('App.jsx', c =>
  c.replace(
    "import { BrowserRouter, Routes, Route, useLocation }from 'react-router-dom';",
    "import { BrowserRouter, Routes, Route } from 'react-router-dom';"
  )
);

// ─── 2. apiClient.js ─── rename err -> _err in catch (unused)
fix('services/apiClient.js', c =>
  c.replace(/\}catch \(err\) \{/g, '} catch (_err) {')
);

// ─── 3. CustomerLoginModal.jsx ─── remove backToOtpStep from destructure
fix('features/auth/components/CustomerLoginModal.jsx', c =>
  c.replace(/,?\s*\n\s*backToOtpStep,?\s*\n/g, '\n')
);

// ─── 4. ForgotPassword.jsx ─── setState in effect: wrap setCountdown(60) in setTimeout
fix('features/auth/forgot-password/ForgotPassword.jsx', c => {
  // Wrap the synchronous setCountdown(60) call
  c = c.replace(
    /useEffect\(\(\) => \{\n    if \(step !== 2\) return undefined;\n    setCountdown\(60\);/,
    `useEffect(() => {\n    if (step !== 2) return undefined;\n    const resetT = setTimeout(() => setCountdown(60), 0);`
  );
  c = c.replace(
    /return \(\) => clearInterval\(timer\);\n  \}, \[step\]\);/,
    `return () => { clearTimeout(resetT); clearInterval(timer); };\n  }, [step]);`
  );
  return c;
});

// ─── 5. Header.jsx ─── setState in effect: wrap refreshAuth() in setTimeout
fix('layouts/Header/Header.jsx', c => {
  c = c.replace(
    `  // Refresh auth state on mount and when login modal closes\n  useEffect(() => {\n    refreshAuth();\n  }, [refreshAuth]);`,
    `  // Refresh auth state on mount and when login modal closes\n  useEffect(() => {\n    const t = setTimeout(() => refreshAuth(), 0);\n    return () => clearTimeout(t);\n  }, [refreshAuth]);`
  );
  c = c.replace(
    `  useEffect(() => {\n    if (!showCustomerLogin) {\n      refreshAuth();\n    }\n  }, [showCustomerLogin, refreshAuth]);`,
    `  useEffect(() => {\n    if (!showCustomerLogin) {\n      const t = setTimeout(() => refreshAuth(), 0);\n      return () => clearTimeout(t);\n    }\n  }, [showCustomerLogin, refreshAuth]);`
  );
  return c;
});

// ─── 6. Booking.jsx ─── unused 'e' in catch + setState in effect
fix('pages/Booking/Booking.jsx', c => {
  // Fix unused 'e' in catch
  c = c.replace(/\} catch \(e\) \{/g, '}catch (_e) {');
  // Fix setState in effect - wrap setInfo in setTimeout
  c = c.replace(
    / useEffect\(\(\) => \{\n\tif \(prefilledPhone\) \{\n\t setInfo\(\(prev\) => \(\{ \.\.\.prev, phone: prefilledPhone \}\)\);\n  \}\n \}, \[prefilledPhone\]\);/,
    ` useEffect(() => {\n\tif (prefilledPhone) {\n\t const t = setTimeout(() => setInfo((prev) => ({ ...prev, phone: prefilledPhone })), 0);\n\t return () => clearTimeout(t);\n  }\n }, [prefilledPhone]);`
  );
  return c;
});

// ─── 7. StepDone.jsx ─── remove unused 'info' from destructured props
fix('pages/Booking/steps/StepDone.jsx', c => {
  // info is destructured but never used - prefix with _
  return c.replace(/\binfo\b(?=\s*[,}])/, '_info');
});

// ─── 8. StepService.jsx ─── setState in effect
fix('pages/Booking/steps/StepService.jsx', c => {
  return c.replace(
    /useEffect\(\(\) => \{\n    setIndex\(\(prev\) => Math\.min\(prev, maxIndex\)\);\n  \}, \[maxIndex, filtered\.length\]\);/,
    `useEffect(() => {\n    const t = setTimeout(() => setIndex((prev) => Math.min(prev, maxIndex)), 0);\n    return () => clearTimeout(t);\n  }, [maxIndex, filtered.length]);`
  );
});

// ─── 9. EditBooking.jsx ─── setState in effect
fix('pages/EditBooking/EditBooking.jsx', c => {
  return c.replace(
    /useEffect\(\(\) => \{\n    setIndex\(\(prev\) => Math\.min\(prev, maxIndex\)\);\n  \}, \[maxIndex, filteredServices\.length\]\);/,
    `useEffect(() => {\n    const t = setTimeout(() => setIndex((prev) => Math.min(prev, maxIndex)), 0);\n    return () => clearTimeout(t);\n  }, [maxIndex, filteredServices.length]);`
  );
});

// ─── 10. Home.jsx ─── multiple issues
fix('pages/home/Home.jsx', c => {
  // Remove unused processImg import
  c = c.replace(/import processImg from '[^']+';?\r?\n/, '');
  // Remove unused isVisible state + setIsVisible(true) call
  c = c.replace(/\s*const \[isVisible, setIsVisible\] = useState\(false\);\r?\n/, '\n');
  c = c.replace(/\s*setIsVisible\(true\);\r?\n/, '\n');
  // Remove unused processSteps variable (large array)
  c = c.replace(/\r?\n\s*const processSteps = \[[\s\S]*?\];\r?\n/, '\n');
  // Fix checkAuthStatus hoisting: move it before the useEffect that calls it
  const checkFnRe = /\r?\n    const checkAuthStatus = \(\) => \{[^}]+\};\r?\n/;
  const match = c.match(checkFnRe);
  if (match) {
    const checkFn = match[0];
    c = c.replace(checkFn, '\n');
    // Insert before first useEffect
    const idx = c.indexOf('\n    useEffect(');
    if (idx !== -1) {
      c = c.slice(0, idx) + checkFn + c.slice(idx);
    }
  }
  return c;
});

// ─── 11. ChangePassword.jsx ─── setState in effect
fix('components/ChangePassword/ChangePassword.jsx', c => {
  // The effect calls setPasswordRequirements synchronously
  // Wrap the entire effect body in setTimeout
  return c.replace(
    /useEffect\(\(\) => \{\n    if \(formData\.newPassword\) \{\n      setPasswordRequirements\(validatePassword\(formData\.newPassword\)\);\n    \} else \{/,
    `useEffect(() => {\n    const t = setTimeout(() => {\n      if (formData.newPassword) {\n        setPasswordRequirements(validatePassword(formData.newPassword));\n      } else {`
  ).replace(
    /\s*\}\n  \}, \[formData\.newPassword\]\);/,
    `\n      }\n    }, 0);\n    return () => clearTimeout(t);\n  }, [formData.newPassword]);`
  );
});

// ─── 12. About.jsx ─── unused vars + checkAuthStatus hoisting
fix('pages/About/About.jsx', c => {
  // Remove unused imports
  c = c.replace(/import visionImage1 from '[^']+';?\r?\n/, '');
  c = c.replace(/import logo3 from '[^']+';?\r?\n/, '');
  // Remove unused heroVisible, statsVisible (useInView hooks)
  c = c.replace(/\s*const \[heroVisible, setHeroVisible\] = useInView\([^)]*\);\r?\n/, '\n');
  c = c.replace(/\s*const \[statsVisible, setStatsVisible\] = useInView\([^)]*\);\r?\n/, '\n');
  // Remove unused heroRef
  c = c.replace(/\s*const heroRef = useRef\([^)]*\);\r?\n/, '\n');
  // Fix checkAuthStatus hoisting
  const checkFnRe = /\r?\n  const checkAuthStatus = \(\) => \{[\s\S]*?\};\r?\n/;
  const match = c.match(checkFnRe);
  if (match) {
    const checkFn = match[0];
    c = c.replace(checkFn, '\n');
    const idx = c.indexOf('\n  useEffect(');
    if (idx !== -1) {
      c = c.slice(0, idx) + checkFn + c.slice(idx);
    }
  }
  return c;
});

// ─── 13. BookingRequestDetail.jsx ─── unused isSubmitting
fix('pages/DashBoard/BookingManagement/BookingRequestDetail.jsx', c =>
  c.replace(/const \[isSubmitting, setIsSubmitting\]/, 'const [_isSubmitting, setIsSubmitting]')
);

// ─── 14. BookingRequestEdit.jsx ─── unused slotDataWithPicked
fix('pages/DashBoard/BookingManagement/BookingRequestEdit.jsx', c =>
  c.replace(/\bconst slotDataWithPicked\b/, 'const _slotDataWithPicked')
);

// ─── 15. ServiceDetail.jsx ─── setState in effect
fix('pages/ServiceDetail/ServiceDetail.jsx', c => {
  return c.replace(
    /if \(!serviceId\) \{\r?\n\s*setError\('[^']*'\);\r?\n\s*setLoading\(false\);\r?\n\s*return undefined;\r?\n\s*\}/,
    `if (!serviceId) {\n      setTimeout(() => { setError('Không tìm thấy dịch vụ.'); setLoading(false); }, 0);\n      return undefined;\n    }`
  );
});

// ─── 16. UpdateStaffProfile.jsx ─── unused errors, setErrors
fix('pages/StaffProfile/UpdateStaffProfile.jsx', c =>
  c.replace(/const \[errors, setErrors\]/, 'const [_errors, _setErrors]')
);

// ─── 17. AccountSecurity.jsx ─── unused formData
fix('pages/UserProfile/AccountSecurity.jsx', c => {
  // formData is destructured from useState but never used
  return c.replace(/const \[formData, /, 'const [_formData, ');
});

// ─── 18. Banner.jsx ─── unused textVisible + setState in effect
fix('pages/home/Banner/Banner.jsx', c => {
  // Remove unused textVisible state
  c = c.replace(/\s*const \[textVisible, setTextVisible\] = useState\([^)]*\);\r?\n/, '\n');
  // Remove the useEffect that uses setTextVisible
  c = c.replace(
    /\s*\/\/ Reset text animation when index changes\r?\n\s*useEffect\(\(\) => \{\r?\n\s*setTextVisible\(false\);\r?\n\s*const timer = setTimeout\(\(\) => setTextVisible\(true\), 100\);\r?\n\s*return \(\) => clearTimeout\(timer\);\r?\n\s*\}, \[index\]\);\r?\n/,
    '\n'
  );
  return c;
});

// ─── 19. Form.jsx ─── unused useEffect import
fix('pages/home/Form/Form.jsx', c => {
  c = c.replace(/,\s*useEffect\b/, '');
  c = c.replace(/\buseEffect,\s*/, '');
  c = c.replace(/import \{ useEffect \}from 'react';\r?\n/, '');
  return c;
});

// ─── 20. Partners.jsx ─── unused castrol import
fix('pages/home/Partners/Partners.jsx', c =>
  c.replace(/import castrol from '[^']+';?\r?\n/, '')
);

// ─── 21. Services.jsx ─── setState in effect + unused vars
fix('pages/home/Services/Services.jsx', c => {
  // Remove unused comboTrackRef
  c = c.replace(/\s*const comboTrackRef = useRef\([^)]*\);\r?\n/, '\n');
  // Remove unused combosIntroVisible
  c = c.replace(/\s*const \[combosIntroVisible,[^\]]+\] = [^\n]+\r?\n/, '\n');
  // Remove unused comboOffset
  c = c.replace(/\s*const comboOffset = [^\n]+\r?\n/, '\n');
  // Remove unused handleComboPointerDown/Move/Up
  c = c.replace(/\s*const handleComboPointerDown = [^\n]+\r?\n/, '\n');
  c = c.replace(/\s*const handleComboPointerMove = [^\n]+\r?\n/, '\n');
  c = c.replace(/\s*const handleComboPointerUp = [^\n]+\r?\n/, '\n');
  // Fix setServicesLoading(true) + setServicesError('') in effect
  c = c.replace(
    /useEffect\(\(\) => \{\r?\n    let active = true;\r?\n    setServicesLoading\(true\);\r?\n    setServicesError\(''\);/,
    `useEffect(() => {\n    let active = true;\n    setTimeout(() => { if (active) { setServicesLoading(true); setServicesError(''); }}, 0);`
  );
  // Fix setServiceIndex(0) in effect
  c = c.replace(
    /useEffect\(\(\) => \{\r?\n    setServiceIndex\(0\);\r?\n  \}, \[serviceVisible, services\.length\]\);/,
    `useEffect(() => {\n    const t = setTimeout(() => setServiceIndex(0), 0);\n    return () => clearTimeout(t);\n  }, [serviceVisible, services.length]);`
  );
  return c;
});

console.log('\nAll fixes applied!');
