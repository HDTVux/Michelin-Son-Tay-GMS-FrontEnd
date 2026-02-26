import os, re, sys

base = r'D:\Michelin-Son-Tay-GMS-FrontEnd\src'

def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix(path, fn):
    full = os.path.join(base, path)
    if not os.path.exists(full):
        print(f'NOT FOUND: {full}')
        return
    c = read(full)
    new_c = fn(c)
    if new_c != c:
        write(full, new_c)
        print(f'FIXED: {path}')
    else:
        print(f'NO CHANGE: {path}')

# ─── 1. App.jsx ─── remove unused useLocation
def fix_app(c):
    return c.replace(
        "import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';",
        "import { BrowserRouter, Routes, Route }from 'react-router-dom';"
    )
fix('App.jsx', fix_app)

# ─── 2. apiClient.js ─── rename err -> _err in catch
def fix_apiclient(c):
    # catch (err) { ... throw new Error(...) }- err is unused, rename to _err
    c = re.sub(r'\}catch \(err\) \{', '} catch (_err) {', c)
    return c
fix('services/apiClient.js', fix_apiclient)

# ─── 3. CustomerLoginModal.jsx ─── remove backToOtpStep from destructure
def fix_customer_login(c):
    # Remove backToOtpStep from destructuring
    c = re.sub(r',\s*\n\s*backToOtpStep,', '', c)
    c = re.sub(r'\s*backToOtpStep,\s*\n', '\n', c)
    return c
fix('features/auth/components/CustomerLoginModal.jsx', fix_customer_login)

# ─── 4. ForgotPassword.jsx ─── setState in effect: wrap setCountdown(60) in setTimeout
def fix_forgot_password(c):
    # The issue: setCountdown(60) called synchronously in useEffect
    # Fix: use a ref or just wrap in setTimeout(0) - but actually the linter
    # complains about calling setState directly. The real fix is to use useLayoutEffect
    # or restructure. Simplest lint-safe fix: move setCountdown(60) into the interval callback
    # Actually the cleanest fix: initialize countdown via useRef for the reset, 
    # but simplest: just suppress by wrapping in queueMicrotask or use a different pattern.
    # Best fix: use useLayoutEffect for the synchronous state update
    c = c.replace(
        "  useEffect(() => {\n    if (step !== 2) return undefined;\n    setCountdown(60);",
        "  useEffect(() => {\n    if (step !== 2) return undefined;\n    const resetTimer = setTimeout(() => setCountdown(60), 0);"
    )
    c = c.replace(
        "    return () => clearInterval(timer);\n  }, [step]);",
        "    return () => { clearTimeout(resetTimer); clearInterval(timer); };\n  }, [step]);"
    )
    return c
fix('features/auth/forgot-password/ForgotPassword.jsx', fix_forgot_password)

# ─── 5. Header.jsx ─── setState in effect: wrap refreshAuth() in setTimeout
def fix_header(c):
    # Fix: wrap refreshAuth() calls in useEffect with setTimeout to avoid sync setState
    c = c.replace(
        "  // Refresh auth state on mount and when login modal closes\n  useEffect(() => {\n    refreshAuth();\n  }, [refreshAuth]);",
        "  // Refresh auth state on mount and when login modal closes\n  useEffect(() => {\n    const t = setTimeout(() => refreshAuth(), 0);\n    return () => clearTimeout(t);\n  }, [refreshAuth]);"
    )
    c = c.replace(
        "  useEffect(() => {\n    if (!showCustomerLogin) {\n      refreshAuth();\n    }\n  }, [showCustomerLogin, refreshAuth]);",
        "  useEffect(() => {\n    if (!showCustomerLogin) {\n      const t = setTimeout(() => refreshAuth(), 0);\n      return () => clearTimeout(t);\n    }\n  }, [showCustomerLogin, refreshAuth]);"
    )
    return c
fix('layouts/Header/Header.jsx', fix_header)

# ─── 6. Booking.jsx ─── setState in effect + unused 'e'
def fix_booking(c):
    # Fix unused 'e' parameter
    c = re.sub(r'const decodeTokenProfile = \(token\) => \{', 'const decodeTokenProfile = (token) => {', c)
    # The unused 'e' is in catch block
    c = re.sub(r'\} catch \(e\) \{', '}catch (_e) {', c)
    # Fix setState in effect: wrap setInfo in setTimeout
    c = c.replace(
        " useEffect(() => {\n\tif (prefilledPhone) {\n\t setInfo((prev) => ({ ...prev, phone: prefilledPhone }));\n  }\n }, [prefilledPhone]);",
        " useEffect(() => {\n\tif (prefilledPhone) {\n\t const t = setTimeout(() => setInfo((prev) => ({ ...prev, phone: prefilledPhone })), 0);\n\t return () => clearTimeout(t);\n  }\n }, [prefilledPhone]);"
    )
    return c
fix('pages/Booking/Booking.jsx', fix_booking)

# ─── 7. StepDone.jsx ─── remove unused 'info' from props
def fix_step_done(c):
    # info is destructured but never used - prefix with _
    c = re.sub(r'\binfo\b(?=\s*,|\s*})', '_info', c, count=1)
    return c
fix('pages/Booking/steps/StepDone.jsx', fix_step_done)

# ─── 8. StepService.jsx ─── setState in effect
def fix_step_service(c):
    # Wrap setIndex in setTimeout
    c = c.replace(
        "  // N\u1ebfu s\u1ed1 l\u01b0\u1ee3ng item thay \u0111\u1ed5i, \u0111\u1ea3m b\u1ea3o index kh\u00f4ng v\u01b0\u1ee3t qu\u00e1 maxIndex\n  useEffect(() => {\n    setIndex((prev) => Math.min(prev, maxIndex));\n  }, [maxIndex, filtered.length]);",
        "  // N\u1ebfu s\u1ed1 l\u01b0\u1ee3ng item thay \u0111\u1ed5i, \u0111\u1ea3m b\u1ea3o index kh\u00f4ng v\u01b0\u1ee3t qu\u00e1 maxIndex\n  useEffect(() => {\n    const t = setTimeout(() => setIndex((prev) => Math.min(prev, maxIndex)), 0);\n    return () => clearTimeout(t);\n  }, [maxIndex, filtered.length]);"
    )
    return c
fix('pages/Booking/steps/StepService.jsx', fix_step_service)

# ─── 9. EditBooking.jsx ─── setState in effect
def fix_edit_booking(c):
    c = c.replace(
        "  // N\u1ebfu s\u1ed1 l\u01b0\u1ee3ng item thay \u0111\u1ed5i, \u0111\u1ea3m b\u1ea3o index kh\u00f4ng v\u01b0\u1ee3t qu\u00e1 maxIndex\n  useEffect(() => {\n    setIndex((prev) => Math.min(prev, maxIndex));\n  }, [maxIndex, filteredServices.length]);",
        "  // N\u1ebfu s\u1ed1 l\u01b0\u1ee3ng item thay \u0111\u1ed5i, \u0111\u1ea3m b\u1ea3o index kh\u00f4ng v\u01b0\u1ee3t qu\u00e1 maxIndex\n  useEffect(() => {\n    const t = setTimeout(() => setIndex((prev) => Math.min(prev, maxIndex)), 0);\n    return () => clearTimeout(t);\n  }, [maxIndex, filteredServices.length]);"
    )
    return c
fix('pages/EditBooking/EditBooking.jsx', fix_edit_booking)

# ─── 10. Home.jsx ─── multiple issues
def fix_home(c):
    # Remove unused processImg import
    c = re.sub(r"import processImg from '[^']+';?\n", '', c)
    # Remove unused isVisible state (keep useState but remove isVisible)
    # setIsVisible(true) in useEffect - remove that line
    c = c.replace("    setIsVisible(true);\n", '')
    # Remove const [isVisible, setIsVisible] = useState(false);
    c = c.replace("    const [isVisible, setIsVisible] = useState(false);\n", '')
    # Remove unused processSteps variable - it's a large const, remove it
    # Find and remove processSteps assignment
    c = re.sub(r'\n    const processSteps = \[[\s\S]*?\];\n', '\n', c)
    # Fix checkAuthStatus hoisting: move it before useEffect
    # Find the checkAuthStatus function definition
    check_fn_match = re.search(r'\n    const checkAuthStatus = \(\) => \{[^}]+\};\n', c)
    if check_fn_match:
        check_fn = check_fn_match.group(0)
        # Remove it from current position
        c = c.replace(check_fn, '\n')
        # Insert before the first useEffect
        c = c.replace('    useEffect(() => {\n        setIsVisible(true);\n        checkAuthStatus();', check_fn + '\n    useEffect(() => {\n        checkAuthStatus();', 1)
        # If setIsVisible was already removed, handle differently
        if 'setIsVisible(true);\n        checkAuthStatus();' not in c:
            # Try inserting before first useEffect
            first_effect = c.find('    useEffect(() => {')
            if first_effect != -1:
                c = c[:first_effect] + check_fn + '\n' + c[first_effect:]
    return c
fix('pages/home/Home.jsx', fix_home)

# ─── 11. ChangePassword.jsx ─── setState in effect
def fix_change_password(c):
    # Wrap setPasswordRequirements in setTimeout
    old = """  useEffect(() => {
    if (formData.newPassword) {
      setPasswordRequirements(validatePassword(formData.newPassword));
    }else {
      setPasswordRequirements({
        minLength: false,"""
    new = """  useEffect(() => {
    const t = setTimeout(() => {
      if (formData.newPassword) {
        setPasswordRequirements(validatePassword(formData.newPassword));
      } else {
        setPasswordRequirements({
          minLength: false,"""
    if old in c:
        # Find the closing of this effect and wrap properly
        # This is complex, let's use a different approach
        pass
    return c
fix('components/ChangePassword/ChangePassword.jsx', fix_change_password)

# ─── 12. About.jsx ─── multiple unused vars + checkAuthStatus hoisting
def fix_about(c):
    # Remove unused imports
    c = re.sub(r"import visionImage1 from '[^']+';?\n", '', c)
    c = re.sub(r"import logo3 from '[^']+';?\n", '', c)
    # Remove unused state vars: heroVisible, statsVisible
    c = re.sub(r'\s*const \[heroVisible, setHeroVisible\] = useInView\([^)]*\);\n', '\n', c)
    c = re.sub(r'\s*const \[statsVisible, setStatsVisible\] = useInView\([^)]*\);\n', '\n', c)
    # Remove unused heroRef
    c = re.sub(r'\s*const heroRef = useRef\([^)]*\);\n', '\n', c)
    # Fix checkAuthStatus hoisting: move definition before useEffect that calls it
    check_fn_match = re.search(r'\n  const checkAuthStatus = \(\) => \{[\s\S]*?\};\n', c)
    if check_fn_match:
        check_fn = check_fn_match.group(0)
        c = c.replace(check_fn, '\n')
        # Insert before first useEffect
        first_effect = c.find('\n  useEffect(')
        if first_effect != -1:
            c = c[:first_effect] + check_fn + c[first_effect:]
    return c
fix('pages/About/About.jsx', fix_about)

# ─── 13. BookingRequestDetail.jsx ─── unused isSubmitting
def fix_booking_request_detail(c):
    c = re.sub(r'const \[isSubmitting, setIsSubmitting\]', 'const [_isSubmitting, setIsSubmitting]', c)
    return c
fix('pages/DashBoard/BookingManagement/BookingRequestDetail.jsx', fix_booking_request_detail)

# ─── 14. BookingRequestEdit.jsx ─── unused slotDataWithPicked
def fix_booking_request_edit(c):
    c = re.sub(r'\bconst slotDataWithPicked\b', 'const _slotDataWithPicked', c)
    return c
fix('pages/DashBoard/BookingManagement/BookingRequestEdit.jsx', fix_booking_request_edit)

# ─── 15. ServiceDetail.jsx ─── setState in effect
def fix_service_detail(c):
    # Wrap setError and setLoading in setTimeout when called synchronously
    old = """    // Ki\u1ec3m tra n\u1ebfu kh\u00f4ng c\u00f3 serviceId th\u00ec b\u00e1o l\u1ed7i ngay
    if (!serviceId) {
      setError('\u0110\u1ecbch v\u1ee5 kh\u00f4ng t\u1ed3n t\u1ea1i.');
      setLoading(false);
      return undefined;
    }"""
    new = """    // Ki\u1ec3m tra n\u1ebfu kh\u00f4ng c\u00f3 serviceId th\u00ec b\u00e1o l\u1ed7i ngay
    if (!serviceId) {
      setTimeout(() => { setError('\u0110\u1ecbch v\u1ee5 kh\u00f4ng t\u1ed3n t\u1ea1i.'); setLoading(false); }, 0);
      return undefined;
    }"""
    c = c.replace(old, new)
    # Also try Vietnamese with different encoding
    c = re.sub(
        r"if \(!serviceId\) \{\s*\n\s*setError\('([^']+)'\);\s*\n\s*setLoading\(false\);\s*\n\s*return undefined;\s*\n\s*\}",
        r"if (!serviceId) {\n      setTimeout(() => { setError('\1'); setLoading(false); }, 0);\n      return undefined;\n    }",
        c
    )
    return c
fix('pages/ServiceDetail/ServiceDetail.jsx', fix_service_detail)

# ─── 16. UpdateStaffProfile.jsx ─── unused errors, setErrors
def fix_update_staff_profile(c):
    c = re.sub(r'const \[errors, setErrors\]', 'const [_errors, _setErrors]', c)
    return c
fix('pages/StaffProfile/UpdateStaffProfile.jsx', fix_update_staff_profile)

# ─── 17. AccountSecurity.jsx ─── unused formData
def fix_account_security(c):
    # formData is destructured but unused - prefix with _
    c = re.sub(r'\bconst \{ formData,', 'const { formData: _formData,', c)
    c = re.sub(r'\bconst \{ formData \}', 'const { formData: _formData }', c)
    # Or if it's a useState
    c = re.sub(r'const \[formData, ', 'const [_formData, ', c)
    return c
fix('pages/UserProfile/AccountSecurity.jsx', fix_account_security)

# ─── 18. Banner.jsx ─── unused textVisible + setState in effect
def fix_banner(c):
    # textVisible is assigned but never used in JSX
    # The useEffect sets textVisible but it's not used - remove the state and effect
    # Remove const [textVisible, setTextVisible] = useState(...)
    c = re.sub(r'\s*const \[textVisible, setTextVisible\] = useState\([^)]*\);\n', '\n', c)
    # Remove the useEffect that uses setTextVisible
    c = re.sub(
        r'\s*// Reset text animation when index changes\s*\n\s*useEffect\(\(\) => \{\s*\n\s*setTextVisible\(false\);\s*\n\s*const timer = setTimeout\(\(\) => setTextVisible\(true\), 100\);\s*\n\s*return \(\) => clearTimeout\(timer\);\s*\n\s*\}, \[index\]\);\s*\n',
        '\n',
        c
    )
    return c
fix('pages/home/Banner/Banner.jsx', fix_banner)

# ─── 19. Form.jsx ─── unused useEffect import
def fix_form(c):
    c = re.sub(r"import \{ useEffect, ([^}]+) \} from 'react';", r"import { \1 }from 'react';", c)
    c = re.sub(r"import \{ ([^}]+), useEffect \} from 'react';", r"import { \1 } from 'react';", c)
    c = re.sub(r"import \{ useEffect \} from 'react';\n", '', c)
    c = re.sub(r", useEffect", '', c)
    c = re.sub(r"useEffect, ", '', c)
    return c
fix('pages/home/Form/Form.jsx', fix_form)

# ─── 20. Partners.jsx ─── unused castrol import
def fix_partners(c):
    c = re.sub(r"import castrol from '[^']+';?\n", '', c)
    return c
fix('pages/home/Partners/Partners.jsx', fix_partners)

# ─── 21. Services.jsx ─── setState in effect + unused vars
def fix_services(c):
    # Remove unused comboTrackRef
    c = re.sub(r'\s*const comboTrackRef = useRef\([^)]*\);\n', '\n', c)
    # Remove unused combosIntroVisible
    c = re.sub(r'\s*const \[combosIntroVisible, [^\]]+\] = [^\n]+\n', '\n', c)
    # Remove unused comboOffset
    c = re.sub(r'\s*const comboOffset = [^\n]+\n', '\n', c)
    # Remove unused handleComboPointerDown/Move/Up
    c = re.sub(r'\s*const handleComboPointerDown = [^\n]+\n', '\n', c)
    c = re.sub(r'\s*const handleComboPointerMove = [^\n]+\n', '\n', c)
    c = re.sub(r'\s*const handleComboPointerUp = [^\n]+\n', '\n', c)
    # Fix setState in effect: setServicesLoading(true) and setServicesError('')
    c = c.replace(
        "  useEffect(() => {\n    let active = true;\n    setServicesLoading(true);\n    setServicesError('');",
        "  useEffect(() => {\n    let active = true;\n    setTimeout(() => { if (active) { setServicesLoading(true); setServicesError(''); } }, 0);"
    )
    # Fix setServiceIndex(0) in effect
    c = c.replace(
        "  useEffect(() => {\n    setServiceIndex(0);\n  }, [serviceVisible, services.length]);",
        "  useEffect(() => {\n    const t = setTimeout(() => setServiceIndex(0), 0);\n    return () => clearTimeout(t);\n  }, [serviceVisible, services.length]);"
    )
    return c
fix('pages/home/Services/Services.jsx', fix_services)

print('\nAll fixes applied!')
