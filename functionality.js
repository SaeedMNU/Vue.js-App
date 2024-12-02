let webstore = new Vue({
    el: "#app",
    data: { // Referenced state data from index
        sitename: "Lesson Booking App",
        showProduct: true,
        lessons: [],
        cart: [],
        sortKey: 'price',
        sortOrder: 'asc',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        searchQuery: ''
    },
    // Upon app creation, loads lesson data
    created: function () {
        this.fetchLessons();
    },
    methods: {
        // Fetches lesson data from the back-end route
        async fetchLessons() {
            try {
                const response = await fetch("http://localhost:3000/lessons");
                const lessons = await response.json();
                // Returns all lesson data found
                this.lessons = lessons;
            } catch (error) {
                console.error("Error fetching lessons:", error);
            }
        },
        // Searches for a search query by fetching the back-end route
        async searchLessons() {
            try {
                const response = await fetch(`http://localhost:3000/search?q=${this.searchQuery}`);
                const lessons = await response.json();
                // Returns all search results found
                this.lessons = lessons;
            } catch (error) {
                console.error("Error searching lessons:", error);
            }
        },
        // Adds and stores live cart data
        addToCart(lesson) {
            if (this.canAddToCart(lesson)) {
                this.cart.push(lesson.id);
            }
        },
        // Allows switching between product/checkout page
        toggleShowProduct() {
            this.showProduct = !this.showProduct;
        },
        // Tracks cart count for each item
        cartCount(id) {
            return this.cart.filter(itemId => itemId === id).length;
        },
        // Validates cart entry of an item
        canAddToCart(lesson) {
            return lesson.availableSpaces > this.cartCount(lesson.id);
        },
        // Removes 1 booked lesson space from the cart
        removeFromCart(lesson) {
            const index = this.cart.indexOf(lesson.id);
            if (index > -1) {
                this.cart.splice(index, 1);
            }
        },
        // Validate first and last name inputs/placeholders
        validateName() {
            const namePattern = /^[A-Za-z]+$/;
            return namePattern.test(this.firstName) && namePattern.test(this.lastName);
        },
        // Validates phone number input/placeholder
        validatePhone() {
            const phonePattern = /^[0-9]+$/;
            return phonePattern.test(this.phoneNumber);
        },
        async placeOrder() {
            // Tracks lesson(s) updated to ensure no duplicate orders are created for the same lesson
            const lessonOrders = {};

            try {
                // For each lesson in the cart
                for (const lessonId of this.cart) {
                    // Further validation for duplicate orders
                    if (!lessonOrders[lessonId]) {
                        const lesson = this.lessons.find(lesson => lesson.id === lessonId);

                        // For each lesson id found, creates an order
                        if (lesson) {
                            // Create order via POST request
                            const orderResponse = await fetch(`http://localhost:3000/collections/order`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ // Define body of order
                                    id: lesson.id,
                                    bookedSpaces: this.cartCount(lesson.id),
                                    name: `${this.firstName} ${this.lastName}`,
                                    phoneNum: this.phoneNumber
                                })
                            });

                            if (!orderResponse.ok) {
                                const orderError = await orderResponse.text();
                                console.error('Failed to create order:', orderError);
                                throw new Error('Failed to create order.');
                            }

                            // Update lesson availability via PUT request
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

                // Reset the cart and user information input fields
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
        // Count total items in cart or "" if its 0
        totalItemsInTheCart() {
            return this.cart.length || "";
        },
        // Sorts displayed lesson(s) based on the sortKey and sortOrder 
        sortedLessons() {
            return this.lessons.slice().sort((a, b) => {
                let modifier = this.sortOrder === 'asc' ? 1 : -1;
                // If sortKey is price or availableSpaces, it sorts the lessons numerically.
                if (this.sortKey === 'price' || this.sortKey === 'availableSpaces') {
                    return (a[this.sortKey] - b[this.sortKey]) * modifier;
                } else { // Else sortKey is topic or location, it sorts the lessons alphabetically using localeCompare.
                    return a[this.sortKey].localeCompare(b[this.sortKey]) * modifier;
                }
            });
        },
        // Filter lessons in the cart
        cartItems() {
            return this.lessons.filter(lesson => this.cart.includes(lesson.id));
        },
        // Implemented validation of checkout fields to allow checkout
        canCheckout() {
            return this.firstName.trim() !== '' && this.lastName.trim() !== '' && this.phoneNumber !== '' && this.validateName() && this.validatePhone();
        }
    }
});
