'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const cartScript = fs.readFileSync(path.join(__dirname, '..', 'js', 'cart.js'), 'utf8');
const checkoutScript = fs.readFileSync(path.join(__dirname, '..', 'js', 'checkout.js'), 'utf8');

function createBrowserContext(script, initialStorage = {}) {
    const values = new Map(Object.entries(initialStorage));
    const localStorage = {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, String(value));
        },
        removeItem(key) {
            values.delete(key);
        },
    };
    const context = {
        URL,
        URLSearchParams,
        Intl,
        Date,
        console: { error() {}, log() {}, warn() {} },
        localStorage,
        document: {
            addEventListener() {},
            getElementById() { return null; },
            querySelectorAll() { return []; },
        },
        window: {
            location: { href: 'http://localhost/pages/cart.html', search: '' },
            addEventListener() {},
        },
        setTimeout,
        clearTimeout,
    };

    vm.createContext(context);
    vm.runInContext(script, context);
    context.showToast = () => {};
    return { context, localStorage };
}

test('out-of-stock products cannot be increased or added', () => {
    const { context, localStorage } = createBrowserContext(cartScript);

    assert.equal(vm.runInContext('getCartItemMax({ stock: 0 })', context), 0);
    context.product = { id: 'shoe-1', name: 'Shoe', price: 100, stock: 0 };
    assert.equal(vm.runInContext('addToCart(product)', context), false);
    assert.equal(localStorage.getItem('sportzone_cart'), null);
});

test('addToCart merges equivalent IDs and counts stock across variants', () => {
    const cart = [{
        id: '7',
        name: 'Shoe',
        price: 100,
        stock: 4,
        size: 'M',
        color: 'Red',
        quantity: 2,
    }];
    const { context, localStorage } = createBrowserContext(cartScript, {
        sportzone_cart: JSON.stringify(cart),
    });

    context.product = {
        id: 7, name: 'Shoe', price: 100, stock: 4,
        size: 'M', color: 'Red', quantity: 1,
    };
    assert.equal(vm.runInContext('addToCart(product)', context), true);

    context.product = {
        id: 7, name: 'Shoe', price: 100, stock: 4,
        size: 'L', color: 'Red', quantity: 2,
    };
    assert.equal(vm.runInContext('addToCart(product)', context), false);

    const savedCart = JSON.parse(localStorage.getItem('sportzone_cart'));
    assert.equal(savedCart.length, 1);
    assert.equal(savedCart[0].quantity, 3);
});

test('cart image paths resolve from the project root and unsafe URLs use a placeholder', () => {
    const { context } = createBrowserContext(cartScript);

    assert.equal(
        vm.runInContext("getCartImageUrl({ image: 'images/products/shoe.png', category: 'Gym' })", context),
        'http://localhost/images/products/shoe.png'
    );
    assert.equal(
        vm.runInContext("getCartImageUrl({ image: 'javascript:alert(1)', category: 'Unknown' })", context),
        'http://localhost/images/products/balo-gym.svg'
    );
});

test('cart item text is escaped before rendering', () => {
    const { context } = createBrowserContext(cartScript);
    context.item = {
        id: 'item-1',
        name: '<img src=x onerror=alert(1)>',
        brand: 'Brand',
        category: 'Gym',
        price: 100,
        quantity: 1,
    };

    const html = vm.runInContext('renderCartItem(item)', context);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.doesNotMatch(html, /<img src=x/);
    assert.doesNotMatch(html, /\sonerror=["']/);
});

test('checkout removes the selected legacy cart variant without matching a different item', () => {
    const fullCart = [
        { id: 'a__b', selectedSize: 'M', selectedColor: 'Red', quantity: 1 },
        { id: 'a', size: 'b__M', color: 'Red', quantity: 1 },
    ];
    const { context, localStorage } = createBrowserContext(checkoutScript, {
        sportzone_cart: JSON.stringify(fullCart),
    });
    context.orderedItems = [{ id: 'a__b', size: 'M', color: 'Red' }];

    assert.equal(vm.runInContext('removeOrderedItemsFromCart(orderedItems)', context), true);
    const remaining = JSON.parse(localStorage.getItem('sportzone_cart'));
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, 'a');
});
