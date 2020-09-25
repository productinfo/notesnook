function upgrade(user) {
  const { TwoCoInlineCart: cart } = window;
  if (!cart) return;
  cart.setup.setMerchant("250327951921"); // your Merchant code
  cart.billing.setEmail(user.email); // customer email address
  cart.shipping.setEmail(user.email); // customer Delivery email
  cart.cart.setExternalCustomerReference(user.Id);
  cart.cart.setTest(true);

  cart.products.add({
    code: "notesnook",
    quantity: 1,
  });

  cart.cart.setCartLockedFlag(true);
  cart.cart.checkout().then(console.log); // start checkout process
}

export { upgrade };