'use strict';

var React = require('react');
var mountedComponents = require('./mounted-components');

/**
 * Clear a react component.
 * @param {String} targetSelector - the component's DOM selector
 */
module.exports = function clearComponent(targetSelector) {
    if (mountedComponents[targetSelector]) {
        React.unmountComponentAtNode(document.querySelector(targetSelector));
        delete mountedComponents[targetSelector];
        console.info('Component ' + targetSelector + ' unmounted.');
    }
};