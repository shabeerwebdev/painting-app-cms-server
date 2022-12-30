const stripe = require("stripe")(process.env.STRIPE_KEY);

("use strict");

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { paintings } = ctx.request.body;
    const lineItems = await Promise.all(
      paintings.map(async (product) => {
        const item = await strapi
          .service("api::painting.painting")
          .findOne(product.id);
        return {
          price_data: {
            currency: "inr",
            product_data: {
              name: item.title,
            },
            unit_amount: item.price * 100,
          },
          quantity: 1,
        };
      })
    );
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}/success.html`,
        cancel_url: `${process.env.CLIENT_URL}/cancel.html`,
        line_items: lineItems,
        payment_method_types: ["card"],
        shipping_address_collection: { allowed_countries: ["IN"] },
        custom_text: {
          shipping_address: {
            message:
              "Use the address as India",
          },
          submit: {
            message: "We'll email you instructions on how to get started.",
          },
        },
      });

      await strapi.service("api::order.order").create({
        data: {
          paintings,
          stripeId: session.id,
        },
      });

      return {
        stripeSession: session,
      };
    } catch (err) {
      ctx.response.status = 500;
      console.log(err);
      return err;
    }
  },
}));
