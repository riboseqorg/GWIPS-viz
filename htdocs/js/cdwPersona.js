/* cdwPersona.js - Hooks up signin and signout buttons to Persona authentication. */

$(function () {
    var email = $.cookie('email');
    $('#signin').click(function(){ navigator.id.request(); });
    $('#signout').click(function(){ navigator.id.logout(); });

    // update navigation bar to show email of logged in user
    if (email) {
        $('#cdw-user').text(email);
    } else {
        $('#signout').hide();
    }

    navigator.id.watch({
      loggedInUser: email,
      onlogin: function(assertion) {
	// A user has logged in! Here you need to:
	// 1. Send the assertion to your backend for verification and to create a session.
	// 2. Update your UI.
	$.ajax({ /* <-- This example uses jQuery, but you can use whatever you'd like */
	  type: 'POST',
	  url: 'cdwWebAuthLogin', // This is a URL on your website.
	  data: {assertion: assertion},
	  success: function(res, status, xhr) { window.location.reload(); },
	  error: function(xhr, status, err) {
	    navigator.id.logout();
	    alert("Login failure: " + err);
	  }
	});
      },
      onlogout: function() {
	// A user has logged out! Here you need to:
	// Tear down the user's session by redirecting the user or making a call to your backend.
	// Also, make sure loggedInUser will get set to null on the next page load.
	// (That's a literal JavaScript null. Not false, 0, or undefined. null.)
	$.ajax({
	  type: 'POST',
	  url: 'cdwWebAuthLogout', // This is a URL on your website.
	  success: function(res, status, xhr) { window.location.reload(); },
	  error: function(xhr, status, err) { alert("Logout failure: " + err); }
	});
      }
    });
});
