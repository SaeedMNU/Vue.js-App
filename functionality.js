let webstore = new Vue({
    el: "#app",
    data: {
        sitename: "Lesson Booking App",
        showProduct: true,
        lessons: [],
        cart: [],
        sortKey: 'price',
        sortOrder: 'asc',
        firstName: '',
        lastName: '',
        phoneNumber: ''
    },
    created: function () {
        this.fetchLessons();
    },
    methods: {
        async fetchLessons() {
            try {
                const response = await fetch("http://localhost:3000/lessons");
                const lessons = await response.json();
                this.lessons = lessons;
            } catch (error) {
                console.error("Error fetching lessons:", error);
            }
        },
        addToCart(lesson) {
            if (this.canAddToCart(lesson)) {
                this.cart.push(lesson.id);
            }
        },
        toggleShowProduct() {
            this.showProduct = !this.showProduct;
        },
        cartCount(id) {
            return this.cart.filter(itemId => itemId === id).length;
        },
        canAddToCart(lesson) {
            return lesson.availableSpaces > this.cartCount(lesson.id);
        },
        removeFromCart(lesson) {
            const index = this.cart.indexOf(lesson.id);
            if (index > -1) {
                this.cart.splice(index, 1);
            }
        },
        validateName() {
            const namePattern = /^[A-Za-z]+$/;
            return namePattern.test(this.firstName) && namePattern.test(this.lastName);
        },
        validatePhone() {
            const phonePattern = /^[0-9]+$/;
            return phonePattern.test(this.phoneNumber);
        },
        async placeOrder() {
            // To ensures no duplicate orders are created for the same lesson
            const lessonOrders = {};

            try {
                for (const lessonId of this.cart) {
                    if (!lessonOrders[lessonId]) {
                        const lesson = this.lessons.find(lesson => lesson.id === lessonId);

                        if (lesson) {
                            // Create order via POST request
                            const orderResponse = await fetch(`http://localhost:3000/collections/order`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    id: lesson.id,
                                    bookedSpaces: this.cartCount(lesson.id), // Number of booked spaces for this lesson
                                    name: `${this.firstName} ${this.lastName}`,
                                    phoneNum: this.phoneNumber
                                })
                            });

                            if (!orderResponse.ok) {
                                const orderError = await orderResponse.text();
                                console.error('Failed to create order:', orderError);
                                throw new Error('Failed to create order.');
                            }

                            // Update lesson via PUT request
                            const updateResponse = await fetch(`http://localhost:3000/collections/products/${lesson._id}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            if (!updateResponse.ok) {
                                const updateError = await updateResponse.text();
                                console.error('Failed to update lesson:', updateError);
                                throw new Error('Failed to update lesson.');
                            }

                            lessonOrders[lessonId] = true; // Mark this lesson as ordered
                        }
                    }
                }

                // Refresh lessons after order is placed
                await this.fetchLessons();

                alert("Order successfully placed!");
                this.cart = [];
                this.firstName = '';
                this.lastName = '';
                this.phoneNumber = '';

            } catch (error) {
                console.error("Error processing order:", error);
                alert("There was an issue placing your order. Please try again.");
            }
        },
    },
    computed: {
        totalItemsInTheCart() {
            return this.cart.length || "";
        },
        sortedLessons() {
            return this.lessons.slice().sort((a, b) => {
                let modifier = this.sortOrder === 'asc' ? 1 : -1;
                // If sortKey is price or availableSpaces, it sorts the lessons numerically.
                if (this.sortKey === 'price' || this.sortKey === 'availableSpaces') {
                    return (a[this.sortKey] - b[this.sortKey]) * modifier;
                    // Else sortKey is topic or location, it sorts the lessons alphabetically using localeCompare.
                } else {
                    return a[this.sortKey].localeCompare(b[this.sortKey]) * modifier;
                }
            });
        },
        cartItems() {
            return this.lessons.filter(lesson => this.cart.includes(lesson.id));
        },
        canCheckout() {
            return this.firstName.trim() !== '' && this.lastName.trim() !== '' && this.phoneNumber !== '' && this.validateName() && this.validatePhone();
        }
    }
});
