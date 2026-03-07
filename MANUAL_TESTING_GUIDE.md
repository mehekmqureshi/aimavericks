# Manual Testing Guide - UI Fixes

## 🎯 Quick Test Checklist

Use this guide to manually verify all UI fixes are working correctly.

---

## Test 1: Input Field Width ✅

### Steps:
1. Open: https://d3m14ih8ommfry.cloudfront.net
2. Click "Create DPP" in the sidebar
3. Fill in:
   - Product Name: "Test Product"
   - Category: "Apparel"
   - Description: (optional)
4. Click "Continue to Lifecycle Data"
5. Click "Add Material" button
6. Observe the table row that appears

### What to Check:
- [ ] Material Name dropdown is wide enough to read options
- [ ] Percentage (%) input shows full numbers without clipping
- [ ] Weight (kg) input is clearly readable
- [ ] Emission Factor input shows decimal numbers fully
- [ ] Origin text input is wide enough for country names
- [ ] Type toggle buttons (Recycled/Virgin) are properly sized
- [ ] Certification input is readable
- [ ] Calculated Emission column shows full values
- [ ] No horizontal scrolling on the page (only within table if needed)

### Expected Result:
✅ All input fields are clearly readable with appropriate spacing. No text is clipped or cut off.

---

## Test 2: Save Draft Button (Not Logged In) ✅

### Steps:
1. Open browser in **Incognito/Private mode**
2. Navigate to: https://d3m14ih8ommfry.cloudfront.net/create-dpp
3. Fill in product information and continue to lifecycle form
4. Add at least one material
5. Look at the "Save Draft" button in the bottom navigation

### What to Check:
- [ ] Button text shows "Login Required" (not "Save Draft")
- [ ] Button is visually disabled (grayed out)
- [ ] Hovering shows a tooltip explaining authentication is required
- [ ] Clicking the button does nothing or shows an error message

### Expected Result:
✅ Button clearly indicates login is required. User understands they need to authenticate.

---

## Test 3: Save Draft Button (Logged In) ✅

### Steps:
1. Log in to the application with valid credentials
2. Navigate to Create DPP page
3. Fill in product information and continue to lifecycle form
4. Add at least one material with data:
   - Material Name: "Organic Cotton"
   - Percentage: 100
   - Weight: 0.5
   - Emission Factor: 5.0
   - Origin: "India"
   - Type: Recycled
   - Certification: "GOTS"
5. Click "Save Draft" button

### What to Check:
- [ ] Button shows "Saving..." briefly
- [ ] Green success toast appears: "Draft saved successfully!"
- [ ] No error messages appear
- [ ] Button returns to "Save Draft" state after saving

### Expected Result:
✅ Draft is saved successfully with clear feedback to the user.

---

## Test 4: Responsive Layout - Zoom Levels ✅

### Steps:
1. Navigate to: https://d3m14ih8ommfry.cloudfront.net/create-dpp
2. Fill in product information and continue to lifecycle form
3. Test at different zoom levels using browser zoom (Ctrl/Cmd + Plus/Minus):

#### Test at 50% Zoom:
- [ ] No extra panels on the right
- [ ] Content stays centered
- [ ] No horizontal scrollbar on page body

#### Test at 75% Zoom:
- [ ] Layout looks clean
- [ ] Emission Preview sidebar visible on right
- [ ] No overflow issues

#### Test at 100% Zoom (Default):
- [ ] Perfect layout
- [ ] Two-column grid (form + sidebar)
- [ ] Everything aligned properly

#### Test at 125% Zoom:
- [ ] Content scales appropriately
- [ ] No horizontal overflow
- [ ] Sidebar still visible

#### Test at 150% Zoom:
- [ ] Layout adapts gracefully
- [ ] May switch to single column on smaller screens
- [ ] No broken elements

#### Test at 200% Zoom:
- [ ] Extreme zoom handled well
- [ ] Single column layout
- [ ] All content accessible

### Expected Result:
✅ At ALL zoom levels:
- No horizontal scrollbar on the page body
- No extra panels appearing on the right
- Content stays centered and contained
- Layout adapts gracefully

---

## Test 5: Mobile Responsiveness ✅

### Steps:
1. Open browser DevTools (F12)
2. Click the device toolbar icon (or Ctrl+Shift+M)
3. Select different devices:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - iPad Pro (1024px)

### What to Check:
- [ ] Emission Preview sidebar moves below form on mobile
- [ ] Table scrolls horizontally within its container (not page-wide)
- [ ] All buttons are full-width and easily tappable
- [ ] No horizontal page scrolling
- [ ] Touch scrolling is smooth
- [ ] Text is readable without zooming
- [ ] Form inputs are appropriately sized for touch

### Expected Result:
✅ Application is fully functional and looks good on all mobile devices.

---

## Test 6: Table Horizontal Scroll ✅

### Steps:
1. Navigate to Create DPP page
2. Continue to lifecycle form
3. Add a material
4. Resize browser window to be narrow (< 1200px wide)

### What to Check:
- [ ] Table has horizontal scrollbar within its container
- [ ] Page body does NOT have horizontal scrollbar
- [ ] Scrolling table doesn't affect page layout
- [ ] All columns remain accessible via horizontal scroll

### Expected Result:
✅ Table scrolls horizontally within its container, not the entire page.

---

## Test 7: Error Handling ✅

### Steps:
1. Log in to the application
2. Navigate to Create DPP page
3. Fill in lifecycle data
4. Open browser DevTools > Network tab
5. Set network to "Offline"
6. Click "Save Draft"

### What to Check:
- [ ] Error message appears
- [ ] Message mentions network/connection issue
- [ ] User understands what went wrong
- [ ] No cryptic error codes

### Expected Result:
✅ Clear, user-friendly error message explaining the issue.

---

## Test 8: Browser Compatibility ✅

Test in multiple browsers:

### Chrome/Edge:
- [ ] All features work
- [ ] Layout is correct
- [ ] No console errors

### Firefox:
- [ ] All features work
- [ ] Layout is correct
- [ ] No console errors

### Safari (if available):
- [ ] All features work
- [ ] Layout is correct
- [ ] No console errors

### Expected Result:
✅ Application works consistently across all modern browsers.

---

## 🎉 Success Criteria

All tests should pass with these results:

1. ✅ Input fields are clearly readable and appropriately sized
2. ✅ Save Draft button works when logged in
3. ✅ Save Draft button shows "Login Required" when not logged in
4. ✅ No layout overflow at any zoom level (50% - 200%)
5. ✅ Responsive design works on all mobile devices
6. ✅ Table scrolls horizontally within container, not page
7. ✅ Error messages are clear and user-friendly
8. ✅ Works in all modern browsers

---

## 📝 Reporting Issues

If any test fails, please note:
1. Which test failed
2. Browser and version
3. Screen size / zoom level
4. Screenshot if possible
5. Console errors (F12 > Console tab)

---

## 🚀 Live Application

**URL**: https://d3m14ih8ommfry.cloudfront.net

**Status**: All fixes deployed and live

**Last Updated**: March 5, 2026

---

## ✅ Automated Tests Passed

All automated tests have passed:
- ✅ Modified files verified
- ✅ Overflow control implemented
- ✅ Input field widths configured
- ✅ Authentication integration complete
- ✅ Build output generated
- ✅ API endpoint accessible
- ✅ Lambda function active
- ✅ DynamoDB table ready

**Ready for manual testing!**
