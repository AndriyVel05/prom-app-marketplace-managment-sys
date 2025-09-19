// Database Management (localStorage)
class OrderDatabase {
    constructor() {
        this.storageKey = 'web_text_generator_orders';
    }

    // Get all orders from localStorage
    getOrders() {
        const orders = localStorage.getItem(this.storageKey);
        return orders ? JSON.parse(orders) : {};
    }

    // Save orders to localStorage
    saveOrders(orders) {
        localStorage.setItem(this.storageKey, JSON.stringify(orders));
    }

    // Save a single order
    saveOrder(orderNumber, orderData) {
        const orders = this.getOrders();
        orders[orderNumber] = orderData;
        this.saveOrders(orders);
    }

    // Get a specific order
    getOrder(orderNumber) {
        const orders = this.getOrders();
        return orders[orderNumber] || null;
    }

    // Check if order exists
    orderExists(orderNumber) {
        const orders = this.getOrders();
        return orders.hasOwnProperty(orderNumber);
    }
}

const db = new OrderDatabase();

// Tab Management
function showTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Hide all tab buttons active state
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => button.classList.remove('active'));

    // Show selected tab
    document.getElementById(tabName).classList.add('active');

    // Activate corresponding button
    const activeButton = Array.from(buttons).find(button => 
        button.textContent.includes(tabName === 'add-order' ? 'Нове замовлення' : 'Пошук замовлення')
    );
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Items Management
function addItem() {
    const container = document.getElementById('items-container');
    const newItem = document.createElement('div');
    newItem.className = 'item-row';
    newItem.innerHTML = `
        <input type="text" placeholder="Назва товару" class="item-name">
        <input type="number" placeholder="Ціна" class="item-price" step="0.01">
        <input type="number" placeholder="Кількість" class="item-quantity">
        <button type="button" class="remove-item" onclick="removeItem(this)">×</button>
    `;
    container.appendChild(newItem);
}

function removeItem(button) {
    const itemRow = button.parentNode;
    itemRow.remove();
}

// Save Order Functionality
function saveOrder() {
    const orderNumber = document.getElementById('order-number').value.trim();
    
    if (!orderNumber) {
        showMessage('Введіть номер замовлення', 'error');
        return;
    }

    // Collect items data
    const itemRows = document.querySelectorAll('.item-row');
    const items = [];

    itemRows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const quantity = parseInt(row.querySelector('.item-quantity').value) || 0;

        if (name && price > 0 && quantity > 0) {
            items.push({ name, price, quantity });
        }
    });

    if (items.length === 0) {
        showMessage('Додайте хоча б один товар з коректними даними', 'error');
        return;
    }

    // Save to database
    const orderData = {
        orderNumber: orderNumber,
        items: items,
        dateCreated: new Date().toISOString(),
        dateModified: new Date().toISOString()
    };

    db.saveOrder(orderNumber, orderData);

    // Clear form
    document.getElementById('order-number').value = '';
    document.querySelectorAll('.item-name, .item-price, .item-quantity').forEach(input => {
        input.value = '';
    });

    // Remove extra item rows, keep only one
    const container = document.getElementById('items-container');
    const rows = container.querySelectorAll('.item-row');
    for (let i = 1; i < rows.length; i++) {
        rows[i].remove();
    }

    showMessage(`Замовлення №${orderNumber} збережено успішно!`, 'success');
}

// Search Order Functionality
function searchOrder() {
    const orderNumber = document.getElementById('search-order-number').value.trim();
    const resultsContainer = document.getElementById('search-results');

    if (!orderNumber) {
        resultsContainer.innerHTML = '<p>Введіть номер замовлення для пошуку</p>';
        return;
    }

    const order = db.getOrder(orderNumber);

    if (order) {
        resultsContainer.innerHTML = `
            <div class="order-result" onclick="viewOrder('${orderNumber}')">
                <h4>Замовлення №${orderNumber}</h4>
                <p>Товарів: ${order.items.length}</p>
                <p>Створено: ${new Date(order.dateCreated).toLocaleDateString('uk-UA')}</p>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = '<p>Замовлення не знайдено</p>';
    }
}

// View specific order
function viewOrder(orderNumber) {
    const order = db.getOrder(orderNumber);
    
    if (!order) {
        showMessage('Замовлення не знайдено', 'error');
        return;
    }

    // Store current order for text generation BEFORE displaying items
    window.currentOrder = order;
    window.isEditing = false;

    // Reset both sections to initial state
    const deliverySection = document.getElementById('delivery-terms-section');
    deliverySection.style.display = 'none';
    
    const promSection = document.getElementById('prom-payment-section');
    promSection.style.display = 'none';
    
    // Clear Prom payment inputs
    document.getElementById('prom-url').value = '';
    document.getElementById('prom-new-order-number').value = '';

    // Update order view
    document.getElementById('order-title').textContent = `Замовлення №${orderNumber}`;
    
    // Display items with edit functionality
    displayOrderItems(order);

    // Show order view
    showOrderView();
}

// Display order items with edit functionality
function displayOrderItems(order) {
    const itemsDisplay = document.getElementById('order-items-display');
    itemsDisplay.innerHTML = `
        <h4>Товари:</h4>
        <button class="edit-order-btn" onclick="toggleEditMode()">Редагувати замовлення</button>
        <div id="items-list"></div>
    `;
    
    updateItemsDisplay();
}

// Update items display based on edit mode
function updateItemsDisplay() {
    const itemsList = document.getElementById('items-list');
    const order = window.currentOrder;
    
    // Safety check
    if (!order || !order.items) {
        console.error('No order or items found');
        return;
    }
    
    itemsList.innerHTML = '';
    
    order.items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        
        if (window.isEditing) {
            itemDiv.className = 'item-display-editable';
            itemDiv.innerHTML = `
                <input type="text" value="${item.name}" data-field="name" data-index="${index}">
                <input type="number" value="${item.price}" step="0.01" data-field="price" data-index="${index}">
                <input type="number" value="${item.quantity}" data-field="quantity" data-index="${index}">
                <button class="save-item-btn" onclick="saveItemChanges(${index})">✓</button>
            `;
        } else {
            itemDiv.className = 'item-display';
            itemDiv.innerHTML = `
                <span>${item.name}</span>
                <span>${item.price} грн × ${item.quantity} шт</span>
            `;
        }
        
        itemsList.appendChild(itemDiv);
    });
}

// Toggle edit mode
function toggleEditMode() {
    window.isEditing = !window.isEditing;
    const editBtn = document.querySelector('.edit-order-btn');
    
    if (window.isEditing) {
        editBtn.textContent = 'Скасувати редагування';
        editBtn.style.background = '#e74c3c';
    } else {
        editBtn.textContent = 'Редагувати замовлення';
        editBtn.style.background = '#f39c12';
    }
    
    updateItemsDisplay();
}

// Save changes to a specific item
function saveItemChanges(itemIndex) {
    const nameInput = document.querySelector(`input[data-field="name"][data-index="${itemIndex}"]`);
    const priceInput = document.querySelector(`input[data-field="price"][data-index="${itemIndex}"]`);
    const quantityInput = document.querySelector(`input[data-field="quantity"][data-index="${itemIndex}"]`);
    
    const name = nameInput.value.trim();
    const price = parseFloat(priceInput.value) || 0;
    const quantity = parseInt(quantityInput.value) || 0;
    
    if (!name || price <= 0 || quantity <= 0) {
        showMessage('Некоректні дані. Перевірте назву, ціну та кількість.', 'error');
        return;
    }
    
    // Update the order data
    window.currentOrder.items[itemIndex] = { name, price, quantity };
    window.currentOrder.dateModified = new Date().toISOString();
    
    // Save to database
    db.saveOrder(window.currentOrder.orderNumber, window.currentOrder);
    
    // Show success message
    showMessage('Зміни збережено!', 'success');
    
    // Update display
    updateItemsDisplay();
}

function showOrderView() {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Show order view
    document.getElementById('order-view').classList.add('active');
}

function goBack() {
    showTab('search-order');
}

// Time-based greeting function
function getTimeBasedGreeting() {
    const currentHour = new Date().getHours();
    
    if (currentHour >= 5 && currentHour < 12) {
        return 'ранку';
    } else if (currentHour >= 12 && currentHour < 18) {
        return 'дня';
    } else {
        return 'вечора';
    }
}

// Text Generation Templates
const textTemplates = {
    availability_request: (order, date) => `
Доброго дня!

Контактуємо щодо вашого замовлення № ${order.orderNumber}. Уточнюємо на складі наявність наступних позицій: ${order.items.map(item => item.name).join(', ')}. Як тільки отримаємо актуальну інформацію - одразу повідомимо в чаті. 😊

З повагою,
Команда All For You
    `.trim(),

    availability_confirmation: (order, date, originalPrices) => {
        let itemsText = order.items.map(item => {
            const originalPrice = originalPrices && originalPrices[item.name];
            const priceText = originalPrice && originalPrice !== item.price ? 
                `${item.price} грн` : 'актуальна';
            return `вартість ${item.name} - ${priceText}`;
        }).join(', ');
        
        return `
Доброго дня!

Отримали актуальну інформацію стосовно вашого запиту, ${itemsText}, товар у наявності на складі. Підтверджуєте дане замовлення?
        `.trim();
    },

    order_only: (order, date, originalPrices, deliveryTerm) => {
        let itemsText = order.items.map(item => {
            const originalPrice = originalPrices && originalPrices[item.name];
            const priceText = originalPrice && originalPrice !== item.price ? 
                `${item.price} грн` : 'актуальна';
            return `${item.name} - ${priceText}`;
        }).join(', ');
        
        const term = deliveryTerm || '7-10 робочих днів';
        
        return `
Доброго дня!

Отримали актуальну інформацію стосовно вашого запиту, ${itemsText}, товар у наявності. Підтверджуєте дане замовлення?, терміни доставки: під замовлення (${term}). Бажаєте замовити?
        `.trim();
    },

    unavailable: (order, date) => `
Доброго дня!

Отримали актуальну інформацію стосовно вашого запиту, на жаль ${order.items.map(item => item.name).join(', ')} немає у наявності, під замовлення привезти товар також неможливо. Чи можемо пропонувати альтернативи?
    `.trim(),

    payment_question: (order, date) => {
        const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const advanceAmount = Math.round(totalAmount * 0.07);
        
        return `
Для товарів у статусі «Під замовлення» доступні два варіанти оплати:

1. Пром-Оплата (повна оплата через додаток Prom)
2. Оплата авансу у розмірі 7% від вартості товару, залишок оплачується при отриманні, ${advanceAmount} грн сума авансу для вашого замовлення

Як вам буде зручніше оплатити?
        `.trim();
    },

    prom_payment: (order, date, promDetails) => `
Доброго дня!

Створили нове замовлення №${promDetails.newOrderNumber}. Можете оплатити замовлення або в особистому кабінеті (замовлення №${order.orderNumber}), або ж за посиланням: ${promDetails.url}
    `.trim(),

    advance_payment: (order, date) => {
        const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const advanceAmount = Math.round(totalAmount * 0.07);
        const greeting = getTimeBasedGreeting();
        
        // Generate itemized list
        const itemsList = order.items.map((item, index) => 
            `${index + 1}. ${item.name} ${item.quantity} шт`
        ).join('\n');
        
        return `
Ціна: ${totalAmount} грн

Оплата авансу за:
${itemsList}

До сплати ${advanceAmount} грн

Отримувач: ФОП Бурий Роман Степанович
IBAN: UA043220010000026008330133525
ІПН/ЄДРПОУ: 3274904630
Акціонерне товариство: УНІВЕРСАЛ БАНК
МФО: 322001
ЄДРПОУ Банку: 21133352
Призначення: Оплата авансу за замовлення

Після оплати надішліть будь ласка квитанцію.

Дякуємо за замовлення!

Гарного вам ${greeting} 😊
        `.trim();
    }
};

// Generate and copy text
function generateText(templateType) {
    if (!window.currentOrder) {
        showMessage('Помилка: замовлення не вибрано', 'error');
        return;
    }

    // For order_only template, handle delivery terms selection
    if (templateType === 'order_only') {
        const deliverySection = document.getElementById('delivery-terms-section');
        
        // If delivery section is not visible, show it WITHOUT error message
        if (deliverySection.style.display === 'none' || !deliverySection.style.display) {
            deliverySection.style.display = 'block';
            return; // Just return without showing error message
        }
        
        // Delivery section is visible, check if user has made a selection
        // (this will be validated by getSelectedDeliveryTerm function)
    }

    // For prom_payment template, handle Prom payment details section
    if (templateType === 'prom_payment') {
        const promSection = document.getElementById('prom-payment-section');
        
        // If Prom section is not visible, show it WITHOUT error message
        if (promSection.style.display === 'none' || !promSection.style.display) {
            promSection.style.display = 'block';
            return; // Just return without showing error message
        }
        
        // Prom section is visible, check if user has filled the details
        // (this will be validated by getPromPaymentDetails function)
    }

    const currentDate = new Date().toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
    });

    let generatedText;
    
    // Handle templates that require additional parameters
    if (templateType === 'availability_confirmation' || templateType === 'order_only') {
        // For these templates, we need to determine if prices changed
        // Since we don't have original prices stored, we'll assume they're current
        const originalPrices = null; // Could be implemented to track price changes
        
        if (templateType === 'order_only') {
            const deliveryTerm = getSelectedDeliveryTerm();
            if (deliveryTerm === null) {
                return; // Error already shown by getSelectedDeliveryTerm
            }
            generatedText = textTemplates[templateType](window.currentOrder, currentDate, originalPrices, deliveryTerm);
        } else {
            generatedText = textTemplates[templateType](window.currentOrder, currentDate, originalPrices);
        }
    } else if (templateType === 'prom_payment') {
        const promDetails = getPromPaymentDetails();
        if (promDetails === null) {
            return; // Error already shown by getPromPaymentDetails
        }
        generatedText = textTemplates[templateType](window.currentOrder, currentDate, promDetails);
    } else {
        generatedText = textTemplates[templateType](window.currentOrder, currentDate);
    }
    
    // Display generated text
    const textDisplay = document.getElementById('generated-text');
    textDisplay.textContent = generatedText;

    // Copy to clipboard
    navigator.clipboard.writeText(generatedText).then(() => {
        showMessage('Текст скопійовано в буфер обміну!', 'success');
    }).catch(err => {
        console.error('Помилка копіювання:', err);
        showMessage('Помилка копіювання тексту', 'error');
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = generatedText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showMessage('Текст скопійовано в буфер обміну!', 'success');
    });
    
    // Hide sections after generation
    if (templateType === 'order_only') {
        // Don't hide immediately to avoid layout shift, let user see the selection
        // The section will be hidden when they navigate away or view another order
        // document.getElementById('delivery-terms-section').style.display = 'none';
    }
    if (templateType === 'prom_payment') {
        // Don't hide immediately to avoid layout shift
        // document.getElementById('prom-payment-section').style.display = 'none';
    }
}

// Get selected delivery term
function getSelectedDeliveryTerm() {
    const selectedRadio = document.querySelector('input[name="delivery-term"]:checked');
    if (!selectedRadio) {
        // No delivery term selected - show error
        showMessage('Оберіть терміни доставки перед генерацією тексту', 'error');
        return null;
    }
    
    if (selectedRadio.value === 'custom') {
        const customTerm = document.getElementById('custom-delivery-term').value.trim();
        if (!customTerm) {
            showMessage('Введіть користувацький термін доставки', 'error');
            return null;
        }
        return customTerm;
    }
    return selectedRadio.value;
}

// Get Prom payment details
function getPromPaymentDetails() {
    const urlInput = document.getElementById('prom-url').value.trim();
    const newOrderNumber = document.getElementById('prom-new-order-number').value.trim();
    
    if (!urlInput) {
        showMessage('Введіть URL для оплати', 'error');
        return null;
    }
    
    if (!newOrderNumber) {
        showMessage('Введіть новий номер замовлення', 'error');
        return null;
    }
    
    return { url: urlInput, newOrderNumber: newOrderNumber };
}

// Show messages
function showMessage(message, type = 'success') {
    // Check if we're in order view to use fixed notification area
    const orderView = document.getElementById('order-view');
    const notificationArea = document.getElementById('notification-area');
    
    if (orderView && orderView.classList.contains('active') && notificationArea) {
        // Use fixed notification area in order view
        notificationArea.innerHTML = '';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        notificationArea.appendChild(messageDiv);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    } else {
        // Use original method for other tabs
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        // Add to current active tab
        const activeTab = document.querySelector('.tab-content.active');
        const formSection = activeTab.querySelector('.form-section');
        formSection.insertBefore(messageDiv, formSection.firstChild);

        // Remove message after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for Enter key
    document.getElementById('order-number').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveOrder();
        }
    });

    document.getElementById('search-order-number').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchOrder();
        }
    });

    // Show success message if there are saved orders
    const orders = db.getOrders();
    if (Object.keys(orders).length > 0) {
        console.log(`Завантажено ${Object.keys(orders).length} збережених замовлень`);
    }
});

// Check Order Modal Functions
function showCheckOrderModal() {
    const modal = document.getElementById('check-order-modal');
    modal.style.display = 'block';
}

function hideCheckOrderModal() {
    const modal = document.getElementById('check-order-modal');
    modal.style.display = 'none';
    
    // Clear form fields
    document.getElementById('customer-address').value = '';
    document.getElementById('customer-phone').value = '';
    document.getElementById('customer-name').value = '';
    
    // Reset radio buttons
    document.querySelector('input[name="payment-type"][value="advance"]').checked = true;
}

// Generate Check Order Text
function generateCheckOrder() {
    const order = window.currentOrder;
    
    if (!order || !order.items || order.items.length === 0) {
        showMessage('Помилка: не знайдено замовлення для генерації чеку', 'error');
        return;
    }

    // Get form values
    const paymentType = document.querySelector('input[name="payment-type"]:checked').value;
    const address = document.getElementById('customer-address').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const customerName = document.getElementById('customer-name').value.trim();

    // Validation
    if (!address || !phone || !customerName) {
        showMessage('Заповніть всі поля форми', 'error');
        return;
    }

    // Calculate totals
    const totalPrice = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const currentDate = new Date().toLocaleDateString('uk-UA');

    // Generate items list
    const itemsList = order.items.map((item, index) => 
        `${index + 1}. ${item.name} ${item.quantity} шт`
    ).join('\n');

    let generatedText = '';

    if (paymentType === 'advance') {
        // Advance payment calculation
        const advance = Math.round(totalPrice * 0.07);
        const postPayment = totalPrice - advance;

        generatedText = `Під замовлення (${currentDate})

Ціна : ${totalPrice} грн

${itemsList}

післяплата: ${postPayment} грн
аванс: ${advance} грн (ФОП)
загальна: ${totalPrice} грн

${address}
${phone}
${customerName}`;

    } else if (paymentType === 'prom') {
        // Prom payment
        generatedText = `Під замовлення (${currentDate})

Ціна : ${totalPrice} грн

${itemsList}

післяплата: 0 грн
аванс: 0 грн
загальна: ${totalPrice} грн (пром-оплата)

${address}
${phone}
${customerName}`;
    }

    // Display generated text
    const textDisplay = document.getElementById('generated-text');
    textDisplay.textContent = generatedText;

    // Copy to clipboard
    navigator.clipboard.writeText(generatedText).then(() => {
        showMessage('Текст скопійовано в буфер обміну!', 'success');
    }).catch(err => {
        console.error('Помилка копіювання:', err);
        showMessage('Помилка копіювання тексту', 'error');
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = generatedText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showMessage('Текст скопійовано в буфер обміну!', 'success');
    });
    
    hideCheckOrderModal();
}