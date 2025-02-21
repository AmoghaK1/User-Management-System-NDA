app.get('/account/payments', auth.ensureAuthenticated, async (req, res) => {
//     try {
//       const user = await User.findById(req.user._id);
//       const activePlan = user.activePlan || 'monthly';
      
//       // Redirect to the appropriate payment page
//       res.redirect(`/payments/${activePlan}`);
//     } catch (error) {
//       console.error('Error loading payment page:', error);
//       res.status(500).render('error', { message: 'Error loading payment page' });
//     }
// });