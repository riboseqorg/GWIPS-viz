// gexTrackSettings - Interactive features for GTEX Body Map version of GTEx Gene track UI page

// Copyright (C) 2016 The Regents of the University of California

// This file contains a single module that encapsulates all javascript data and functions used to manage
// the hgGtexTrackSettings page, which is initially generated by the hgGtexTrackSettings CGI.  
// The page contains an SVG format illustration of a human body with tissues, 
// and a companion list of the same tissues. The tissues are based on the  GTEx Project, and total 53.
//
// Users can interact with either the illustration or the list, and any selections they make will be 
// reflected in the other.  The interactions are click (select/unselect) or hover (highlight the tissue
// in the body map).  There are 53 total tissues -- the GTEx Consortium set.  Tissue abbreviations and
// colors used in the UI are from the hgFixed.gtexTissue table.
//
// Each tissue is represented in the SVG by:
//      1. shape                <path id=$tissue_Pic_Lo>
//      2. highlighted shape    <path id=$tissue_Pic_Hi>
//      3. highlight surround   <path id=$tissue_Aura_Hi>
//      4. label                <text id=$tissue_Text_Hi>
//      5. leader line          <line | polyline id=$tissue_Lead_Hi>
//
// Implementation note: jQuery is used below where effective.  Some SVG manipulation 
//  (e.g. add/remove/toggle classes) don't work from jQuery, so code for that is raw javascript

var gtexTrackSettings = (function() {

    // Globals
    
    var _svgDoc; // SVG has its own DOM
    var _svgRoot;

    // Highlighted tissue is drawn last so it is on top
    var _topTissueId = 'topTissue';
    var _topTissueName = null;
    var _topTissue;     // element
    var _topAura;       // element
    var _topLine;       // element

    var TEXT_HI = '_Text_Hi';
    var LEAD_HI = '_Lead_Hi';
    var AURA_HI = '_Aura_Hi';
    var PIC_HI = '_Pic_Hi';
    var PIC_LO = '_Pic_Lo';

    var COLOR_BLACK = 'black';
    var COLOR_SELECTED = COLOR_BLACK;
    var COLOR_BLUE = 'blue';
    var COLOR_HIGHLIGHT = COLOR_BLUE;
    var COLOR_GRAY = '#737373';
    var COLOR_UNSELECTED = COLOR_GRAY;
    var COLOR_PINK = '#F69296';
    var COLOR_LEADER = COLOR_PINK;

    var CLASS_TISSUE_SELECTED = 'gbmTissueSelected';
    var CLASS_TISSUE_HOVERED = 'gbmTissueHovered';
    var CLASS_TISSUE_LABEL = 'gbmTissueLabel';
    var CLASS_TISSUE_COLOR_PATCH = 'gbmTissueColorPatch';
    var CLASS_TISSUE_HOVERED_COLOR = 'gbmTissueHoveredColor';
    var CLASS_TISSUE_UNSELECTED_COLOR = 'gbmTissueNotSelectedColor';

    // 54 tissues from GTEx, as in hgTracks.gtexTissue table
    // NOTE: kidneyMedulla was added in V8
    // TODO: Consider generating this list during make, to an auxiliary .js file
    var tissues = [
        'adiposeSubcut', 'adiposeVisceral', 'adrenalGland', 'arteryAorta', 'arteryCoronary', 
        'arteryTibial', 'bladder', 'brainAmygdala', 'brainAnCinCortex', 'brainCaudate', 
        'brainCerebelHemi', 'brainCerebellum', 'brainCortex', 'brainFrontCortex', 
        'brainHippocampus', 'brainHypothalamus', 'brainNucAccumbens', 'brainPutamen', 
        'brainSpinalcord', 'brainSubstanNigra', 'breastMamTissue', 'xformedlymphocytes',
        'xformedfibroblasts', 'ectocervix', 'endocervix', 'colonSigmoid', 'colonTransverse',
        'esophagusJunction', 'esophagusMucosa', 'esophagusMuscular', 'fallopianTube', 
        'heartAtrialAppend', 'heartLeftVentricl', 'kidneyCortex', 'kidneyMedulla', 'liver', 'lung', 
        'minorSalivGland', 'muscleSkeletal', 'nerveTibial', 'ovary', 'pancreas', 'pituitary', 
        'prostate', 'skinNotExposed', 'skinExposed', 'smallIntestine', 'spleen', 'stomach', 
        'testis', 'thyroid', 'uterus', 'vagina', 'wholeBlood'
    ];

    // Convenience functions

    function tissueFromSvgId(svgId) {
        // Get tissue name from an SVG id. Convention here is <tis>_*
        return svgId.split('_')[0];
    }

    function setMapTissueElColor(el) {
        // Change appearance of label in body map. This function is part of setTissue(),
        // used at initialization time (when other element attributes are already set by CGI)
        // NOTE: label may be consist of multiple text elements, so traverse children
        // TODO: Try replacing with CSS (First attempt resulted in black only after mouseover!)
        if (el === null) {
            return;
        }
        el.style.fill = COLOR_SELECTED;
        var count = el.childElementCount;
        for (var i = 0; i < count; i++) {
            el.children[i].style.fill = COLOR_SELECTED;
        }
    }

    function clearMapTissueElColor(el) {
        // Change appearance of label in body map.
        // NOTE: label may be consist of multiple text elements, so traverse children
        // TODO: Try replacing with CSS
        if (el === null) {
            return;
        }
        el.style.fill = COLOR_UNSELECTED;
        var count = el.childElementCount;
        for (var i = 0; i < count; i++) {
            el.children[i].style.fill = COLOR_UNSELECTED;
        }
    }

    function setTissue(tis) {
        // Mark selected in tissue list and body map
        var $tis = $('#' + tis);
        $tis.addClass(CLASS_TISSUE_SELECTED);

        // Change appearance of color patch in tissue list
        var colorPatch = $tis.prev('.' + CLASS_TISSUE_COLOR_PATCH);
        var tisColor = colorPatch.data('tissueColor');  // data function prefixes 'data-' to class
        colorPatch.css('background-color', tisColor);
        colorPatch.removeClass(CLASS_TISSUE_UNSELECTED_COLOR); 
                // TODO: less obfuscated approach to colored border

        // Set hidden input checkbox, for cart
        $('#' + tis + ' > input').attr('checked', true);

        // Change appearance of label in body map
        var el = _svgDoc.getElementById(tis + TEXT_HI);
        if (el !== null) {
            el.classList.add(CLASS_TISSUE_SELECTED);
            setMapTissueElColor(el);
        }
    }

    function clearTissue(tis) {
        // Unselect in tissue table and body map
        var $tis = $('#' + tis);
        $tis.removeClass(CLASS_TISSUE_SELECTED);

        // Change appearance of color patch in tissue list
        colorPatch = $tis.prev('.' + CLASS_TISSUE_COLOR_PATCH);
        colorPatch.addClass(CLASS_TISSUE_UNSELECTED_COLOR);

        // Clear hidden input checkbox
        $('#' + tis + ' > input').attr('checked', false);

        // Change appearance of label in body map
        var el = _svgDoc.getElementById(tis + TEXT_HI);
        if (el !== null) {
            el.classList.remove(CLASS_TISSUE_SELECTED);
            clearMapTissueElColor(el);
        }
    }

    function toggleTissue(tis) {
        // Select/unselect tissue in list and body map
        var $tis = $('#' + tis);
        $tis.toggleClass(CLASS_TISSUE_SELECTED);
        if ($tis.hasClass(CLASS_TISSUE_SELECTED)) {
            setTissue(tis);
        } else {
            clearTissue(tis);
        }
    }

    function highlightTissue(tis) {
        // Highlight tissue label and color patch in tissue table
        toggleHighlightTissue(tis, true);
    }

    function unHighlightTissue(tis) {
        toggleHighlightTissue(tis, false);
    }

    function toggleHighlightTissue(tis, isHovered) {
        // Highlight/unhighlight tissue in body map and tissue table

        // Highlight tissue label and color patch in tissue table
        var $tis = $('#' + tis);
        if (tis === null) {
            return;
        }
        if (isHovered && _topTissueName !== null) {
            return;
        }
        $tis.toggleClass(CLASS_TISSUE_HOVERED, isHovered);
        var $colorPatch = $tis.prev('.' + CLASS_TISSUE_COLOR_PATCH);
        $colorPatch.toggleClass(CLASS_TISSUE_HOVERED_COLOR, isHovered);

        // Highlight tissue in body map by changing text appearance, visually moving organ to top
        // and adding a white (or sometimes blue if white background) surround ('aura')

        // Highlight tissue label in body map
        // TODO:  Try jQuery here
        var textEl = _svgDoc.getElementById(tis + TEXT_HI);
        if (textEl === null) {
            return;
        }
        // TODO: unify with text styling below.  Perhaps just add class to children will do it.
        textEl.classList.toggle(CLASS_TISSUE_HOVERED, isHovered);

        var lineEl = _svgDoc.getElementById(tis + LEAD_HI);
        var pic = $('#' + tis + PIC_HI, _svgRoot);
        var picEl = _svgDoc.getElementById(tis + PIC_HI);
        var aura = $('#' + tis + AURA_HI, _svgRoot);
        var auraEl = _svgDoc.getElementById(tis + AURA_HI);
        var textLineCount = textEl.childElementCount;
        var i;

        if (isHovered) {
            textEl.style.fill = COLOR_HIGHLIGHT;
            for (i = 0; i < textLineCount; i++) {
                textEl.children[i].style.fill = COLOR_HIGHLIGHT;
            }
            if (lineEl !== null) {     // cell types lack leader lines
                lineEl.style.stroke = COLOR_HIGHLIGHT;
            }
            var topAura = auraEl.cloneNode(true);
            topAura.id = 'topAura';
            _topAura = _svgRoot.appendChild(topAura);
            $(_topAura).show();

            var topTissue = picEl.cloneNode(true);
            topTissue.addEventListener('mouseleave', onMapLeaveTissue);
            topTissue.id = _topTissueId;
            _topTissueName = tis;
            _topTissue = _svgRoot.appendChild(topTissue);
            $(_topTissue).show();

            var topLine = lineEl.cloneNode(true);
            topLine.id = 'topLine';
            _topLine = _svgRoot.appendChild(topLine);
            $(_topLine).show();
        } else {
            var color = textEl.classList.contains(CLASS_TISSUE_SELECTED) ? 
                                COLOR_SELECTED : COLOR_UNSELECTED;
            textEl.style.fill = color;
            for (i = 0; i < textLineCount; i++) {
                textEl.children[i].style.fill = color;
            }
            if (lineEl !== null) {     // cell types lack leader lines
                lineEl.style.stroke = COLOR_LEADER;      // pink
            }
            _svgRoot.removeChild(_topTissue);
            _topTissueName = null;
            _svgRoot.removeChild(_topAura);
            _svgRoot.removeChild(_topLine);
        }
    }

    // Event handlers

    function onClickSetAll() {
        // Set all on body map and tissue list
        tissues.forEach(setTissue);
    }

    function onClickClearAll() {
        // Clear all on body map and tissue list
        tissues.forEach(clearTissue);
    }

    function onClickToggleTissue(ev) {
        // Select/unselect from tissue list
        tis = ev.data;
        toggleTissue(tis);
    }

    function onMapClickToggleTissue(ev) {
        // Select/unselect from illustration
        var svgId = ev.currentTarget.id;
        var tis = tissueFromSvgId(svgId);
        toggleTissue(tis);
    }

    function onEnterTissue(ev) {
        // Mouseover on label in tissue list
        highlightTissue(ev.data);
    }

    function onLeaveTissue(ev) {
        // Mouseover on label in tissue list
        unHighlightTissue(ev.data);
    }

    function onMapEnterTissue(ev) {
        // Mouseover on tissue shape or label in illustration
        var svgId = ev.currentTarget.id;
        var tis = (svgId === _topTissueId ? _topTissueName :  tissueFromSvgId(svgId));
        highlightTissue(tis);
    }

    function onMapLeaveTissue(ev) {
        // Mouseover on tissue shape or label in illustration
        var toTarget = ev.relatedTarget;
        var toParent;

        //  Handle case where lower and upper shapes are not the same.  If leaving lower to enter upper, we are not really leaving
        if (toTarget) {
            if (toTarget.id === _topTissueId) {
                return;
            }
            //  Handle case where there are multiple paths for the tissue, and topTissue will be a parent
            toParent = toTarget.parentElement;
            if (toParent && toParent.id === _topTissueId) {
                return;
            }
        }
        var svgId = ev.currentTarget.id;
        var tis = (svgId === _topTissueId ? _topTissueName :  tissueFromSvgId(svgId));
        unHighlightTissue(tis);
    }

    function submitForm() {
    // Submit the form (from GO button -- as in hgGateway.js)
    // Show a spinner -- sometimes it takes a while for hgTracks to start displaying.
        $('.gbIconGo').removeClass('fa-play').addClass('fa-spinner fa-spin');
        $form = $('form');
        $form.submit();
    }

    function toggleShowSampleCount() {
    // Show or hide sample counts in tissue table
        var sampleCount = $('.gbmTissueSampleCount')[0];
        if ($(sampleCount).is(':visible')) {
            $('.gbmTissueTable').removeClass('gbmTissueTableWithSamples');
            ($('.gbmTissueSampleCount').hide());
        } else {
            $('.gbmTissueTable').addClass('gbmTissueTableWithSamples');
            ($('.gbmTissueSampleCount').show());
        }
    }

    // Initialization

    function initTissue(tis) {
        // Set tissue to unhighlighted state
        $('#' + tis + PIC_HI, _svgRoot).hide();
        $('#' + tis + AURA_HI, _svgRoot).hide();

        // Mark tissue labels in svg
        var textEl = _svgDoc.getElementById(tis + TEXT_HI);
        if (textEl !== null) {
            textEl.classList.add(CLASS_TISSUE_LABEL);
            if ($('#' + tis).hasClass(CLASS_TISSUE_SELECTED)) {
                textEl.classList.add(CLASS_TISSUE_SELECTED);
                setMapTissueElColor(textEl);
            }
        }
    }

    function initBodyMap() {
        // Set organs to unhighlighted state
        tissues.forEach(initTissue);
    }

    function animateTissue(tis) {
        // Add event handlers to body map and tissue list

        // Add click and mouseover handler to tissue label in tissue list
        var $tis = $('#' + tis);
        $tis.click(tis, onClickToggleTissue);
        $tis.mouseenter(tis, onEnterTissue);
        $tis.mouseleave(tis, onLeaveTissue);

        // Add click and mouseover handler to color patch in tissue list
        var $colorPatch = $tis.prev('.' + CLASS_TISSUE_COLOR_PATCH);
        $colorPatch.click(tis, onClickToggleTissue);
        $colorPatch.mouseenter(tis, onEnterTissue);
        $colorPatch.mouseleave(tis, onLeaveTissue);

        // Add mouseover and click handlers to tissue label in body map
        var textEl = _svgDoc.getElementById(tis + TEXT_HI);
        if (textEl !== null) {
            textEl.addEventListener('click', onMapClickToggleTissue);
            textEl.addEventListener('mouseenter', onMapEnterTissue);
            textEl.addEventListener('mouseleave', onMapLeaveTissue);
        }
        // add mouseover and click handlers to tissue shape
        var picEl = _svgDoc.getElementById(tis + PIC_LO);
        if (picEl !== null) {
            picEl.addEventListener('mouseenter', onMapEnterTissue);
            picEl.addEventListener('mouseleave', onMapLeaveTissue);
            picEl.addEventListener('mouseup', onMapClickToggleTissue);
        }
    }

    function animateTissues() {
        // Add event handlers to tissue table and body map SVG
        $('#setAll').click(onClickSetAll);
        $('#clearAll').click(onClickClearAll);
        tissues.forEach(animateTissue);
    }

    function initSvg() {
        var svgEl = document.getElementById('bodyMapSvg');
        _svgDoc = svgEl.contentDocument;
        _svgRoot = _svgDoc.documentElement;
        initBodyMap();
        animateTissues();
    }

    function init() {
        // cart.setCgi('gtexTrackSettings');

        $(function() {
            // After SVG load, tweak layout and initialize event handlers
            document.getElementById('bodyMapSvg').addEventListener('load', initSvg, false);
            $('.gbButtonGoContainer').click(submitForm);

            // hide/show of sample counts
            ($('.gbmTissueSampleCount').hide());
            $('#showSampleCount').click(toggleShowSampleCount);
        });
    }

    return {
            init: init
           };
    
}()); // gtexTrackSettings

gtexTrackSettings.init();
