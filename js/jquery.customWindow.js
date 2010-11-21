/*! Copyright (c) 2009 Domenico Gigante (http://scripts.reloadlab.net)
 * 
 * Dual licensed under:
 * 
 * 1) MIT (http://www.opensource.org/licenses/mit-license.php)
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 * 2) GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 * CustomScroller is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * CustomScroller is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with CustomScroller.  If not, see <http://www.gnu.org/licenses/>.
 * 
 * Thanks to: http://fromvega.com/scripts for drag effect.
 * Thanks for the community that is helping the improvement
 * of this little piece of code.
 *
 * Version: 1.0.0
 * Date: 9th Nov, 2009
 * 
 * Requires: jQuery 1.3.2+
 */

(function ($) {
    // some private vars
    var _wins = {};
    var _settings;
    var _dragStatus = {};
    var _handler = {};
    var _bubblings = {};
    var _isMinimize = [];
    var _resizeCallbacks = {};
    
    // get/set max z-index in a group
    $.maxZIndex = $.fn.maxZIndex = function (options) {
        var options = $.extend({
                 inc: 10,
                 group: "*"
            }, options);    
        
        var zmax = 0;
        
        $(options.group).each(function () {
            var cur = parseInt($(this).css('z-index'), 10);
            zmax = cur > zmax ? cur : zmax;
        });
        
        if (!this.jquery)
            return zmax;
    
        return this.each(function () {
            zmax += options.inc;
            $(this).css("z-index", zmax);
        });
    };
    
    // set a window behind others
    var setBehind = function (id) {
        $.each(_wins, function (key, value) {
            if (typeof value !== 'function') {
                if (key !== id) {
                    _wins[key].container.addClass('unselectWindow');
                } else {
                    _wins[key].container.removeClass('unselectWindow');
                    $(_wins[key].container).maxZIndex({ inc: 5, group: '.customWindowContainer' });
                }
            }
        });
    };
    
    // retrieve window with max z-index and set behind
    var maxZIndex = function () {
        var maxZ = 0;
        var elem;
        $.each(_wins, function (key, value) {
            if (typeof value !== 'function') {
                if (_wins[key].min === false && parseInt(_wins[key].container.css("z-index"), 10) > maxZ) {
                    elem = key;
                    maxZ = parseInt(_wins[key].container.css("z-index"), 10);
                }
            }
        });
        
        if(elem) setBehind(elem);
    };
    
    // number of windows minimize
    var countMinimize = function () {
        var i = 0;
        $.each(_wins, function (key, value) {
            if (typeof value !== 'function') {
                if (_wins[key].min === true) {
                    i++;
                }
            }
        });
        
        return i;
    };
    
    // retrieve window with max z-index
    var winBehind = function () {
        var maxZ = 0;
        var elem;
        $.each(_wins, function (key, value) {
            if (typeof value !== 'function') {
                if (_wins[key].min === false && _wins[key].max === false && parseInt(_wins[key].container.css("z-index"), 10) > maxZ) {
                    elem = key;
                    maxZ = parseInt(_wins[key].container.css("z-index"), 10);
                }
            }
        });
        
        return elem;
    };
    
    // set text unselectable cross-browser
    function makeUnselectable (elem) {
        if (typeof(elem) == 'string')
            elem = $(elem)[0];
        if (elem) {
            elem.onselectstart = function() { return false; };
            elem.style.MozUserSelect = "none";
            elem.style.KhtmlUserSelect = "none";
            elem.unselectable = "on";
        }
    };
    
    // IE6 fix for select box over absolute positioned element 
    var fixSelect = function () {
        if ($.browser.msie && $.browser.version < 7) {
            var i = 0;
            $.each(_wins, function (key, value) {
                if (typeof value !== 'function') {
                    if (_wins[key].min === false) {
                        i++;
                    }
                }
            });

            if (i > 0) $('select').css('visibility', 'hidden');
            else $('select').css('visibility', 'visible');
        }
    };
    
    // Main function
    $.customWindow = function (options) {
        
        // default settings
        _settings = $.extend({
            winId: null,
            width: 2/3,
            height: 3/4,
            title: 'Custom Window',
            appendTo: 'body',
            onopen: null,
            onclose: null,
            onresize: null
        }, options);
        
        var arrayPageScroll = [parseInt($(document).scrollLeft(), 10), parseInt($(document).scrollTop(), 10)];
        var arrayViewPort = [parseInt($(window).width(), 10), parseInt($(window).height(), 10)];
                
        // ID UNIQUE
        var _uniqueID = (_settings.windId) ? _settings.windId : "customWindowID_" + (new Date().getTime());
        
        // HTML TEMPLATE
        var _customWindowHtml = '<div id="' + _uniqueID + '" class="customWindowContainer">';
        _customWindowHtml += '<div class="customWindowWidthResize" style="-moz-user-select: none;"></div>';
        _customWindowHtml += '<div class="customWindowHeightResize" style="-moz-user-select: none;"></div>';
        _customWindowHtml += '<div class="customWindowHead">';
        _customWindowHtml += '<span class="customWindowClose"></span>';
        _customWindowHtml += '<span class="customWindowRestore"></span>';
        _customWindowHtml += '<span class="customWindowMaximize"></span>';
        _customWindowHtml += '<span class="customWindowMinimize"></span>';
        _customWindowHtml += '<span class="customWindowTitle" style="-moz-user-select: none;"></span>';
        _customWindowHtml += '<div style="clear: both"></div>';
        _customWindowHtml += '</div>';
        _customWindowHtml += '<div class="customWindowcontent"></div>';
        _customWindowHtml += '<div class="customWindowStatus">';
        _customWindowHtml += '<span class="customWindowResize" style="-moz-user-select: none;"></span>';
        _customWindowHtml += '<div style="clear: both"></div>';
        _customWindowHtml += '</div>';
        _customWindowHtml += '</div>';
            
        $(_settings.appendTo).append(_customWindowHtml);
                
        // OBJECT WINDOW ARRAY
        _wins[_uniqueID] = {};
                
        // WINDOW COMPONENT
        _wins[_uniqueID].container = $('#' + _uniqueID);
        _wins[_uniqueID].head = $('.customWindowHead', _wins[_uniqueID].container);
        _wins[_uniqueID].status = $('.customWindowStatus', _wins[_uniqueID].container);
        _wins[_uniqueID].content = $('.customWindowcontent', _wins[_uniqueID].container);
        _wins[_uniqueID].title = $('.customWindowTitle ', _wins[_uniqueID].container);
        _wins[_uniqueID].resizeIcon = $('.customWindowResize ', _wins[_uniqueID].container);
        _wins[_uniqueID].resizeWidth = $('.customWindowWidthResize ', _wins[_uniqueID].container);
        _wins[_uniqueID].resizeHeight = $('.customWindowHeightResize ', _wins[_uniqueID].container);
        _wins[_uniqueID].closeIcon = $('.customWindowClose', _wins[_uniqueID].container);
        _wins[_uniqueID].restoreIcon = $('.customWindowRestore', _wins[_uniqueID].container);
        _wins[_uniqueID].minimizeIcon = $('.customWindowMinimize', _wins[_uniqueID].container);
        _wins[_uniqueID].maximizeIcon = $('.customWindowMaximize', _wins[_uniqueID].container);
                
        // SET SOME CSS DEFAULT
        _wins[_uniqueID].container.css({
                                    position: 'absolute',
                                    margin: '0px'
                                });
                
        _wins[_uniqueID].head.css({
                                margin: '0px',
                                border: '0px',
                                padding: '0px'
                            });
        
        _wins[_uniqueID].title.css({
                                cursor: 'default'
                            });
        
        _wins[_uniqueID].status.css({
                                margin: '0px',
                                border: '0px',
                                padding: '0px'
                            });
                
        _wins[_uniqueID].resizeIcon.css({
                                margin: '0px',
                                border: '0px',
                                padding: '0px'
                            });
                
        _wins[_uniqueID].resizeWidth.css({
                                position: 'absolute',
                                top: '0',
                                right: '0',
                                width: '3px',
                                height: '100%',
                                margin: '0px',
                                border: '0px',
                                padding: '0px'
                            });
                
        _wins[_uniqueID].resizeHeight.css({
                                position: 'absolute',
                                bottom: '0',
                                left: '0',
                                width: '100%',
                                height: '3px',
                                position: 'absolute',
                                margin: '0px',
                                border: '0px',
                                padding: '0px'
                            });
                
        // IE6 fix for overflow auto bug
        if ($.browser.msie && $.browser.version < 7) {
            _wins[_uniqueID].content.css({
                                    margin: '0px',
                                    padding: '0px',
                                    border: '0px',
                                    overflow: 'auto',
                                    height: '1px',
                                    width: '100%'
                                });
        } else {
            _wins[_uniqueID].content.css({
                                    margin: '0px',
                                    overflow: 'auto',
                                    height: '1px',
                                    width: 'auto'
                                });
        }
                
        _wins[_uniqueID].restoreIcon.hide();
        
        if ($().corner) {
            _wins[_uniqueID].container.corner('top 4px');
        }
                
        // SET WINDOW WIDTH
        if (_settings.width > 100 && _settings.width < arrayViewPort[0]) {
            var width = parseInt(_settings.width, 10);
            _wins[_uniqueID].container.width(width);
        } else if (_settings.width > 0 && _settings.width < 1) {
            var width = parseInt(arrayViewPort[0] * _settings.width, 10);
            _wins[_uniqueID].container.width(width);
        } else {
            var width = parseInt(arrayViewPort[0] * (2/3), 10);
            _wins[_uniqueID].container.width(width);
        }
                
        // SET WINDOW HEIGHT
        if (_settings.height > 100 && _settings.height < arrayViewPort[1]) {
            var height = parseInt(_settings.height, 10);
            _wins[_uniqueID].container.height(height);
        } else if (_settings.height > 0 && _settings.height < 1) {
            var height = parseInt(arrayViewPort[1] * _settings.height, 10);
            _wins[_uniqueID].container.height(height);
        } else {
            var height = parseInt(arrayViewPort[1] * (3/4), 10);
            _wins[_uniqueID].container.height(height);
        }
                
        // SET CONTENT HEIGHT
        _wins[_uniqueID].containerHPad = _wins[_uniqueID].head.outerHeight(true) + _wins[_uniqueID].status.outerHeight(true) + (_wins[_uniqueID].content.outerHeight() - _wins[_uniqueID].content.height());
        _wins[_uniqueID].content.height(height - _wins[_uniqueID].containerHPad);
                
        // SET TOP AND LEFT POSITION
        var inFront = winBehind();
        if (inFront && _wins[inFront]) {
            var winTopPos = parseInt(_wins[inFront].container.css('top'), 10) + 35;
            var winLeftPos = parseInt(_wins[inFront].container.css('left'), 10) + 25;
        }
        
        if (!winTopPos && !winLeftPos) {
            var top = parseInt((arrayPageScroll[1] + ((arrayViewPort[1] - height) / 2)), 10);
            var left = parseInt((arrayPageScroll[0] + ((arrayViewPort[0] - width) / 2)), 10);
        } else if (winTopPos - arrayPageScroll[1] + height < arrayViewPort[1] && winLeftPos - arrayPageScroll[0] + width < arrayViewPort[0]) {
            var top = winTopPos;
            var left = winLeftPos;
        } else {
            var top = 0;
            var left = 0;
        }
        _wins[_uniqueID].container.css('top', top + 'px');
        _wins[_uniqueID].container.css('left', left + 'px');
                
        // SET TITLE
        if (_settings.title != '') _wins[_uniqueID].title.html(_settings.title);
        
        makeUnselectable('.customWindowTitle');
                
        // SET DRAG HANDLER
        _wins[_uniqueID].container.dragWindow({
                                        allowBubbling: false, 
                                        win: _uniqueID
                                    });
        _wins[_uniqueID].container.setDragHandler(_wins[_uniqueID].head);
                
        // SET RESIZE HANDLER
        _wins[_uniqueID].container.resizeWindow({
                                            allowBubbling: false, 
                                            win: _uniqueID, 
                                            cursor: 'nw-resize',
                                            resizing: 'both',
                                            minWidth: 200, 
                                            minHeight: 200
                                        });
        _wins[_uniqueID].container.setResizeHandler(_wins[_uniqueID].resizeIcon);
        
        _wins[_uniqueID].container.resizeWindow({
                                            allowBubbling: false, 
                                            win: _uniqueID, 
                                            cursor: 'w-resize',
                                            resizing: 'width',
                                            minWidth: 200, 
                                            minHeight: 200
                                        });
        _wins[_uniqueID].container.setResizeHandler(_wins[_uniqueID].resizeWidth);
                
        _wins[_uniqueID].container.resizeWindow({
                                            allowBubbling: false, 
                                            win: _uniqueID, 
                                            cursor: 'n-resize',
                                            resizing: 'height',
                                            minWidth: 200, 
                                            minHeight: 200
                                        });
        _wins[_uniqueID].container.setResizeHandler(_wins[_uniqueID].resizeHeight);
        
        _wins[_uniqueID].container.bind('mousedown', function (e) {
                    if (!_wins[_uniqueID] || _wins[_uniqueID].min === true) return false;
                    
                    // set z-index
                    $(this).maxZIndex({ inc: 5, group: '.customWindowContainer' });
                    
                    setBehind(this.id);
                    
                    // Must return true to let events bubble. Otherwise it
                    // becomes impossible to interact with window content.
                    return true;
        });
        
        // WINDOW PARAM
        _wins[_uniqueID].width = width;
        _wins[_uniqueID].height = height;
        _wins[_uniqueID].top = top;
        _wins[_uniqueID].left = left;
        _wins[_uniqueID].containerWPad = _wins[_uniqueID].container.outerWidth() - _wins[_uniqueID].container.width()
        _wins[_uniqueID].heightMin = 1 + _wins[_uniqueID].head.outerHeight(true) + (_wins[_uniqueID].container.outerHeight() - _wins[_uniqueID].container.height());
        _wins[_uniqueID].min = false;
        _wins[_uniqueID].max = false;
                
        setBehind(_uniqueID);
        
        fixSelect();
        
        // SET CLOSE EVENT
        var closeWin = function (id) {
            if (!_wins[id]) return false;
            
            _wins[id].container.remove();
            
            if (typeof _settings.onclose === 'function'){
                _settings.onclose();
            }
            
            delete _wins[id];
            
            maxZIndex();
        };
        
        _wins[_uniqueID].closeIcon.bind('click', function (e) {
            
            closeWin(_uniqueID);
            
            fixSelect();
            
            return false;
        });
        
        // SET MINIMIZE EVENT
        var minimizeWin = function (id) {
            if (!_wins[id] || _wins[id].min === true) return false;
            
            var arrayPageScroll = [parseInt($(document).scrollLeft(), 10), parseInt($(document).scrollTop(), 10)];
            var arrayViewPort = [parseInt($(window).width(), 10), parseInt($(window).height(), 10)];
            
            _wins[id].min = true;
                    
            _isMinimize.push(id);
                    
            _wins[id].content.hide();
            _wins[id].status.hide();
            _wins[id].resizeIcon.hide();
            _wins[id].resizeWidth.hide();
            _wins[id].resizeHeight.hide();
            _wins[id].minimizeIcon.hide();
            _wins[id].closeIcon.hide();
            _wins[id].maximizeIcon.hide();
            _wins[id].restoreIcon.hide();
            
            var theClone = _wins[id].container.clone();
            
            _wins[id].container.css({
                                position: 'fixed',
                                top: null,
                                bottom: 0,
                                height: _wins[id].head.outerHeight() + 'px'
                            });
            if ($.browser.msie && $.browser.version < 7) {
                _wins[id].container.css({
                                    position: 'absolute'
                                });
            }
            
            var numMin = countMinimize();
            var step = parseInt((arrayViewPort[0] - ((_wins[id].containerWPad + 1) * numMin))  / numMin, 10);
            if (step > 200) step = 200;
            
            var desktop = function () {
                var i = 0;
                $.each(_isMinimize, function (key, value) {
                    if (typeof value === 'string') {
                        if (_wins[value].min === true) {
                            var newWidth = step + _wins[value].containerWPad;
                            var posL = (i) * (newWidth + 1);
                                
                            _wins[value].container.css({
                                                    left: posL + 'px',
                                                    width: step + 'px'
                                                });
                                
                            i++;
                        }
                    }
                });
            };
                    
            _wins[id].container.dragOff();
                    
            _wins[id].container.addClass('unselectWindow');
            
            _wins[id].container.hide();
            
            $(_settings.appendTo).append(theClone);
            theClone.animate({
                            height: _wins[id].head.outerHeight() + 'px',
                            width: step + 'px',
                            top: (arrayPageScroll[1] + arrayViewPort[1] - _wins[_uniqueID].heightMin) + 'px',
                            left: ((numMin - 1) * (step + _wins[id].containerWPad + 1)) + 'px',
                            opacity: 0
                        }, {
                        duration: 'fast', 
                        complete: function () {
                                theClone.remove();
                                desktop();
                                _wins[id].container.show();
                                maxZIndex();
                            } 
                        });
        };
        
        _wins[_uniqueID].minimizeIcon.bind('click', function (e) {
            
            minimizeWin(_uniqueID);
            
            fixSelect();
                    
            return false;
                    
        });
                
        // SET MAXIMIZE EVENT
        var maximizeWin = function (id) {
            if (!_wins[id] || _wins[id].max === true) return false;
            
            var indexMinimize = $.inArray(id, _isMinimize);
            
            if (indexMinimize >= 0) _isMinimize.splice(indexMinimize, 1);
                    
            var arrayPageScroll = [parseInt($(document).scrollLeft(), 10), parseInt($(document).scrollTop(), 10)];
            var arrayViewPort = [parseInt($(window).width(), 10), parseInt($(window).height(), 10)];
            
            _wins[id].max = true;
            _wins[id].min = false;
            
            _wins[id].content.hide();
            _wins[id].status.show();
            _wins[id].minimizeIcon.show();
            _wins[id].closeIcon.show();
            _wins[id].maximizeIcon.hide();
            _wins[id].restoreIcon.show();
            _wins[id].resizeIcon.hide();
            _wins[id].resizeWidth.hide();
            _wins[id].resizeHeight.hide();
                                
            var theClone = _wins[id].container.clone();
            
            theClone.css({
                         top: _wins[id].container.offset().top + 'px',
                         left: _wins[id].container.offset().left + 'px'
                    });
                
            _wins[id].container.css({
                                        position: 'absolute',
                                        height: (arrayViewPort[1] - (_wins[id].container.outerHeight() - _wins[id].container.height())) + 'px',
                                        width: (arrayViewPort[0] - (_wins[id].container.outerWidth() - _wins[id].container.width())) + 'px',
                                        top: arrayPageScroll[1] + 'px',
                                        left: arrayPageScroll[0] + 'px'
                                    });
            
            var numMin = countMinimize();
                        
            var step = parseInt((arrayViewPort[0] - ((_wins[id].containerWPad + 1) * numMin))  / numMin, 10);
                        
            if (step > 200) step = 200;
                        
            var desktop = function (id) {
                var i = 0;
                $.each(_isMinimize, function (key, value) {
                    if (typeof value === 'string') {
                        if (_wins[value].min === true) {
                            var newWidth = step + _wins[value].containerWPad;
                            var posL = (i) * (newWidth + 1);
                                    
                            _wins[value].container.css({
                                                    left: posL + 'px',
                                                    width: step + 'px'
                                                });
                                
                            i++;
                        }
                    }
                });
            };
                        
            _wins[id].container.dragOff();
                    
            _wins[id].container.removeClass('unselectWindow');
            
            _wins[id].container.hide();
            
            $(_settings.appendTo).append(theClone);
            theClone.animate({
                            height: (arrayViewPort[1] - (_wins[id].container.outerHeight() - _wins[id].container.height())) + 'px',
                            width: (arrayViewPort[0] - (_wins[id].container.outerWidth() - _wins[id].container.width())) + 'px',
                            top: arrayPageScroll[1] + 'px',
                            left: arrayPageScroll[0] + 'px',
                            opacity: 0
                        }, {
                        duration: 'fast', 
                        complete: function () {
                                theClone.remove();
                                desktop();
                                _wins[id].container.show();
                                _wins[id].content.height(_wins[id].container.height() - _wins[id].containerHPad);
                                _wins[id].content.show();
                                setBehind(id);
                                if (typeof _settings.onresize === 'function'){
                                    _settings.onresize(_wins[id]);
                                }
                            } 
                        });
        };
        
        _wins[_uniqueID].maximizeIcon.bind('click', function (e) {
            
            maximizeWin(_uniqueID);
            
            fixSelect();
                    
            return false;
                    
        });
                
        // SET RESTORE EVENT
        var restoreWin = function (id) {
            if (!_wins[id]) return false;
            
            var indexMinimize = $.inArray(id, _isMinimize);
                
            if (indexMinimize >= 0) _isMinimize.splice(indexMinimize, 1);
                    
            if (_wins[id].min === true) {
                _wins[id].min = false;
                _wins[id].max = false;
                    
                _wins[id].content.show();
                _wins[id].status.show();
                _wins[id].maximizeIcon.show();
                _wins[id].closeIcon.show();
                _wins[id].minimizeIcon.show();
                _wins[id].restoreIcon.hide();
                _wins[id].resizeIcon.show();
                _wins[id].resizeWidth.show();
                _wins[id].resizeHeight.show();
                    
                var theClone = _wins[id].container.clone();
                
                theClone.css({
                             top: _wins[id].container.offset().top + 'px',
                             left: _wins[id].container.offset().left + 'px'
                        });
                
                _wins[id].container.css({
                                            position: 'absolute',
                                            top: _wins[id].top + 'px',
                                            bottom: null,
                                            left: _wins[id].left + 'px',
                                            width: _wins[id].width + 'px',
                                            height: _wins[id].height + 'px'
                                        });
                    
                var numMin = countMinimize();
                        
                var step = parseInt((arrayViewPort[0] - ((_wins[id].containerWPad + 1) * numMin))  / numMin, 10);
                        
                if (step > 200) step = 200;
                        
                var desktop = function (id) {
                    var i = 0;
                    $.each(_isMinimize, function (key, value) {
                        if (typeof value === 'string') {
                            if (_wins[value].min === true) {
                                var newWidth = step + _wins[value].containerWPad;
                                var posL = (i) * (newWidth + 1);
                                        
                                _wins[value].container.css({
                                                        left: posL + 'px',
                                                        width: step + 'px'
                                                    });
                                    
                                i++;
                            }
                        }
                    });
                };
                        
                _wins[id].container.dragOn();
                
                _wins[id].container.hide();
                        
                $(_settings.appendTo).append(theClone);
                theClone.animate({
                                height:_wins[id].height + 'px',
                                width: _wins[id].width + 'px',
                                top: _wins[id].top + 'px',
                                left: _wins[id].left + 'px',
                                opacity: 0
                            }, {
                            duration: 'fast', 
                            complete: function () {
                                    theClone.remove();
                                    desktop();
                                    _wins[id].container.show();
                                    _wins[id].content.height(_wins[id].container.height() - _wins[id].containerHPad);
                                    _wins[id].content.show();
                                    setBehind(id);
                                } 
                            });
                
            } else if (_wins[id].max === true) {
                _wins[id].min = false;
                _wins[id].max = false;
                
                _wins[id].content.hide();
                _wins[id].status.show();
                _wins[id].restoreIcon.hide();
                _wins[id].maximizeIcon.show();
                _wins[id].closeIcon.show();
                _wins[id].minimizeIcon.show();
                _wins[id].resizeIcon.show();
                _wins[id].resizeWidth.show();
                _wins[id].resizeHeight.show();
                    
                var theClone = _wins[id].container.clone();
                
                _wins[id].container.css({
                                            position: 'absolute',
                                            top: _wins[id].top + 'px',
                                            bottom: null,
                                            left: _wins[id].left,
                                            width: _wins[id].width + 'px',
                                            height: _wins[id].height + 'px'
                                        });
                    
                _wins[id].container.dragOn();
                
                _wins[id].container.hide();
                        
                $(_settings.appendTo).append(theClone);
                theClone.animate({
                                height:_wins[id].height + 'px',
                                width: _wins[id].width + 'px',
                                top: _wins[id].top + 'px',
                                left: _wins[id].left + 'px',
                                opacity: 0
                            }, {
                            duration: 'fast', 
                            complete: function () {
                                    theClone.remove();
                                    _wins[id].container.show();
                                    _wins[id].content.height(_wins[id].container.height() - _wins[id].containerHPad);
                                    _wins[id].content.show();
                                    if (typeof _settings.onresize === 'function'){
                                        _settings.onresize(_wins[id]);
                                    }
                                } 
                            });
                
                setBehind(id);
            }
        };
        
        _wins[_uniqueID].restoreIcon.bind('click', function (e) {
            
            restoreWin(_uniqueID);
            
            fixSelect();
                    
            return false;
                    
        });
        
        _wins[_uniqueID].head.bind('dblclick', function (e) {
            
            if (_wins[_uniqueID].min === true) {
                if (_wins[_uniqueID].max === true) {
                    _wins[_uniqueID].max = false;
                    maximizeWin(_uniqueID);
                } else {
                    restoreWin(_uniqueID);
                }
            } else {
                if (_wins[_uniqueID].max === true) {
                    restoreWin(_uniqueID);
                } else {
                    maximizeWin(_uniqueID);
                }
            }
            
            fixSelect();
            
            return false;
        });
        
        if (typeof _settings.onopen === 'function'){
            _settings.onopen(_wins[_uniqueID].content, _wins[_uniqueID]);
        }
        
        // set a function to be called on resize event
        if (typeof _settings.onresize === 'function'){
            _wins[_uniqueID].container.onresize(_settings.onresize);
        }

        return {
                    container: _wins[_uniqueID].container,
                    head: _wins[_uniqueID].head,
                    status: _wins[_uniqueID].status,
                    resizeIcon: _wins[_uniqueID].resizeIcon,
                    title: _wins[_uniqueID].title,
                    closeIcon: _wins[_uniqueID].closeIcon,
                    minimizeIcon: _wins[_uniqueID].minimizeIcon,
                    maximizeIcon: _wins[_uniqueID].maximizeIcon,
                    restoreIcon: _wins[_uniqueID].restoreIcon,
                    content: _wins[_uniqueID].content,
                    'close': function () { closeWin(_uniqueID); },
                    minimize: function () { minimizeWin(_uniqueID); },
                    maximize: function () { maximizeWin(_uniqueID); },
                    restore: function () { restoreWin(_uniqueID); }
                };
                
    };
    
    // Drag Plugin (Windows Draggable)
    $.fn.dragWindow = function (options) {
        // some private vars
        var _isMouseDown = false;
        var _currentElement = null;
        var _lastMouseX;
        var _lastMouseY;
        var _lastElemTop;
        var _lastElemLeft;
        var _holdingHandler = false;
        
        options = $.extend({
            win: null,
            allowBubbling: false
        }, options);
        
        // disable the dragging feature for the element
        $.fn.dragOff = function () {
            return this.each(function () {
                _dragStatus[this.id] = 'off';
            });
        };
        
        // enable the dragging feature for the element
        $.fn.dragOn = function () {
            return this.each(function () {
                if (_handler[this.id]) {
                    _dragStatus[this.id] = 'handler';
                } else {
                    _dragStatus[this.id] = 'on';
                }
            });
        };
    
        // set a child element as a handler
        $.fn.setDragHandler = function (handler) {
            
            return this.each(function () {
                var _draggable = this;
                
                _handler[this.id] = handler;
                
                // enable event bubbling so the user can reach the handle
                _bubblings[this.id] = true;
                
                // set current drag status
                _dragStatus[_draggable.id] = "handler";
    
                // bind event handler
                handler.bind('mousedown', function (e) {
                    _holdingHandler = true;
                });
                
                // bind event handler
                handler.bind('mouseup', function (e) {
                    _holdingHandler = false;
                });
            });
        };
        
        // updates the position of the current element being dragged
        var updatePosition = function (e, id) {
            var spanX = (e.pageX - _lastMouseX);
            var spanY = (e.pageY - _lastMouseY);
            
            var Y = _lastElemTop + spanY;
            var X = _lastElemLeft + spanX;
            
            $(_currentElement).css("top",  Y + 'px');
            $(_currentElement).css("left", X + 'px');
            
            if (id) {
                _wins[id].top = Y;
                _wins[id].left = X;
            }
        };
        
        // when the mouse is moved while the mouse button is pressed
        $(document).bind("mousemove", function (e) {
            if (_isMouseDown === true && _dragStatus[_currentElement.id] !== 'off') {
                // update the position and call the registered function
                updatePosition(e, options.win);
                
                return false;
            }
        });
        
        // when the mouse button is released
        $(document).bind("mouseup", function (e) {
            if (_isMouseDown === true && _dragStatus[_currentElement.id] !== 'off') {
                _isMouseDown = false;
 
                return false;
            }
        });
        
        if (this.length > 0) {
            this.each(function (index, domElement) {
                // if no id is defined assign a unique one
                if (undefined === this.id || !this.id.length) this.id = "dragableWindow_"+(new Date().getTime());
                
                _bubblings[this.id] = options.allowBubbling ? true : false;
                
                // set dragStatus 
                _dragStatus[domElement.id] = "on";

                // when an element is let go after dragging
                $(this).bind("mouseup", function(e) {
                    // remove class marking this window as being dragged
                    $(this).removeClass("customWindowDragging");

                    return _bubblings[this.id];
                });
                
                // when an element receives a mouse press
                $(this).bind("mousedown", function (e) {
                    
                    // if drag status is off, break
                    if((_dragStatus[this.id] == "off") || (_dragStatus[this.id] == "handler" && !_holdingHandler))
                        return _bubblings[this.id];
                    
                    // set it as absolute positioned
                    $(this).css("position", "absolute");

                    // add class marking this window as being dragged
                    $(this).addClass("customWindowDragging");
                    
                    // set z-index
                    $(this).maxZIndex({ inc: 5, group: '.customWindowContainer' });
                    
                    setBehind(this.id);
                    
                    // update track variables
                    _isMouseDown = true;
                    _currentElement = this;
                    
                    // retrieve positioning properties
                    var offset = $(this).offset();
                    var additionalOffSet = {
                        top: 0, 
                        left: 0
                    };
                    var parentOffSet = $(this).offsetParent();
                    if (!(parentOffSet[0].nodeName == 'BODY' || parentOffSet[0].nodeName == 'HTML') && parentOffSet.length > 0) {
                        additionalOffSet.top = parentOffSet.offset().top;
                        additionalOffSet.left = parentOffSet.offset().left;
                    }
                    
                    // global position records
                    _lastMouseX = e.pageX;
                    _lastMouseY = e.pageY;
                    
                    _lastElemTop = offset.top - additionalOffSet.top;
                    _lastElemLeft = offset.left - additionalOffSet.left;
                    
                    // update the position
                    updatePosition(e, options.win);
                    
                    return _bubblings[this.id];
                });
            });
        }
    };
        
    // register the function to be called when a window is resized
    $.fn.onresize = function(callback){
        return this.each(function(){
            _resizeCallbacks[this.id] = callback;
        });
    };

    // Resize Plugin (Windows resizable)
    $.fn.resizeWindow = function (options) {
        // some private vars
        var _isMouseDown = false;
        var _currentElement = null;
        var _resizeStatus = {};
        var _offsetX;
        var _offsetY;
        var _deltaTop;
        var _deltaLeft;
        var _lastMouseX;
        var _lastMouseY;
        var _bubblings2 = {};
        var _holdingHandler = false;
        
        options = $.extend({
            win: null,
            cursor: 'nw-resize',
            resizing: 'both',
            minWidth: null,
            minHeight: null,
            maxWidth: null,
            maxHeight: null,
            allowBubbling: false
        }, options);
        
        // set a child element as a handler
        $.fn.setResizeHandler = function (handler) {
            return this.each(function () {
                var _resizeable = this;
                
                // enable event bubbling so the user can reach the handle
                _bubblings2[this.id] = true;
                
                $(_resizeable).css("cursor", "");
                
                // set current resize status
                _resizeStatus[_resizeable.id] = "handler";
                
                $(handler).css("cursor", options.cursor);
                
                // bind event handler
                handler.bind('mousedown', function(e){
                    _holdingHandler = true;
                });
                
                // bind event handler
                handler.bind('mouseup', function(e){
                    _holdingHandler = false;
                });
            });
        };
        
        // updates the size of the current element being resized
        var updateSize = function (e, id) {         
            var width = e.pageX + _deltaLeft - _offsetX;
            var height = e.pageY + _deltaTop - _offsetY;
            
            if (options.minWidth !== null && width < options.minWidth) width = options.minWidth;
            if (options.minHeight !== null && height < options.minHeight) height = options.minHeight;
            if (options.maxWidth !== null && width > options.maxWidth) width = options.maxWidth;
            if (options.maxHeight !== null && height > options.maxHeight) height = options.maxHeight;
            
            if (id) {
                if (options.resizing === 'both' || options.resizing === 'width') {
                    _wins[id].width = width;
                    _wins[id].container.width(width);
                }
                if (options.resizing === 'both' || options.resizing === 'height') {
                    _wins[id].height = height;
                    _wins[id].container.height(height);
                    _wins[id].content.height(height - _wins[id].containerHPad);
                }
            
            }
        };
        
        // when the mouse is moved while the mouse button is pressed
        $(document).bind("mousemove", function (e) {
            if (_isMouseDown === true && _resizeStatus[_currentElement.id] !== 'off') {

                updateSize(e, options.win);
                return false;
            }
        });
        
        // when the mouse button is released
        $(document).bind("mouseup", function (e) {
            if (_isMouseDown === true && _resizeStatus[_currentElement.id] !== 'off') {
                _isMouseDown = false;

                if(_resizeCallbacks[_currentElement.id] != undefined){
                    _resizeCallbacks[_currentElement.id](_wins[options.win]);
                }
                
                return false;
            }
        });
        
        if (this.length > 0) {
            this.each(function (index, domElement) {
                // if no id is defined assign a unique one
                if (undefined === this.id || !this.id.length) this.id = "resizeableWindow_"+(new Date().getTime());
                
                _bubblings2[this.id] = options.allowBubbling ? true : false;
                
                // set resizeStatus 
                _resizeStatus[domElement.id] = "on";
                
                $(this).css("cursor", options.cursor);

                // when an elemnt is let go
                $(this).bind("mouseup", function(e) {
                    // remove class marking this window as being resized
                    $(this).removeClass('customWindowResizing');
                });

                // when an element receives a mouse press
                $(this).bind("mousedown", function (e) {
                    
                    // if resize status is off, break
                    if((_resizeStatus[this.id] == "off") || (_resizeStatus[this.id] == "handler" && !_holdingHandler))
                        return _bubblings2[this.id];

                    // add class marking thiw window as being resized
                    $(this).addClass('customWindowResizing');

                    // update track variables
                    _isMouseDown = true;
                    _currentElement = this;
                    
                    // retrieve positioning properties
                    var offset = $(_currentElement).offset();
                    
                    _offsetX = offset.left;
                    _offsetY = offset.top;
                    
                    // global position records
                    _lastMouseX = e.pageX;
                    _lastMouseY = e.pageY;

                    _deltaTop = _offsetY + $(_currentElement).height() - _lastMouseY;
                    _deltaLeft = _offsetX + $(_currentElement).width() - _lastMouseX;
                    
                    // update the position
                    updateSize(e, options.win);
                   
                    return _bubblings2[this.id];
                });
            });
        }
    };
})(jQuery);
