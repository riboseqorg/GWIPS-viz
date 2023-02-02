// jsHelper functions: functions invoked in html generated by jsHelper.c

// f_scrollTop and f_filterResults are used by jsHelper's jsSetVerticalPosition;
// code taken from
// http://www.softcomplex.com/docs/get_window_size_and_scrollbar_position.html
function f_scrollTop() {
	return f_filterResults (
		window.pageYOffset ? window.pageYOffset : 0,
		document.documentElement ? document.documentElement.scrollTop : 0,
		document.body ? document.body.scrollTop : 0
	);
}
function f_filterResults(n_win, n_docel, n_body) {
	var n_result = n_win ? n_win : 0;
	if (n_docel && (!n_result || (n_result > n_docel)))
		n_result = n_docel;
	return n_body && (!n_result || (n_result > n_body)) ? n_body : n_result;
}


function setRadioCheck(varName, value)
// Iterate through all elements in mainForm (probably should use $/CSS selector!)
// and when we find one named varName, we compare value and check/uncheck accordingly.
// Used by jsHelper's jsRadioUpdate.
{
var len = document.mainForm.elements.length;
var i = 0;
for (i = 0; i < len; i++)
    {
    if (document.mainForm.elements[i].name == varName)
	{
	if (document.mainForm.elements[i].value == value)
	    document.mainForm.elements[i].checked = true;
	else
	    document.mainForm.elements[i].checked = false;
	}
    }
}

function getKeyCode(e)
// Get the numeric value of the key just pressed, cross-platform.
{
if (window.event) // IE
    {
    return e.keyCode;
    }
else
    {
    return e.which;
    }
}

function gotEnterKey(e)
// Detect the Enter key and return true if pressed.
{
return getKeyCode(e) == 13;
}

var submitted = false;

function submitOnEnter(e,f)
// When Enter is pressed, set global variable 'submitted' and run f (unless submitted already).
{
if(gotEnterKey(e))
   {
   if (!submitted)
      {
      submitted = true;
      f.submit();
      }
   return false;
   }
else
   return true;
}

function noSubmitOnEnter(e)
// Return false when the enter key is pressed, to keep the event from propagating.
{
return !gotEnterKey(e);
}

function pressOnEnter(e, button)
// When Enter is pressed, simulate a click on button.
{
if (gotEnterKey(e))
    {
    button.click();
    return false;
    }
else
    {
    return true;
    }
}

function setClearAllInit($el)
// $el should contain buttons labeled 'Set all' and 'Clear all' (or whatever jsHelper.h
// defines for JS_{SET,CLEAR}_ALL_BUTTON_LABEL).  Set up event handlers on those to act
// on all checkboxes in $el.
{
var $checkboxes = $el.find('input[type="checkbox"]');
var $setAll = $el.find('input[type="button"][value="Set all"]');
var $clearAll = $el.find('input[type="button"][value="Clear all"]');
$setAll.bind('click', function() {
    $checkboxes.each( function(ix, el) { el.checked = true; });
    });
$clearAll.bind('click', function() {
    $checkboxes.each( function(ix, el) { el.checked = false; });
    });
}

$(document).ready(function()
// Identify widgets by class and initialize them.
{
$('.setClearContainer').each(function(i, el) { setClearAllInit($(el)); });
});
