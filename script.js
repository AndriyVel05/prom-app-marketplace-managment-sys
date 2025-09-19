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
                `${item.price} грн` : 'вартість актуальна';
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
                `${item.price} грн` : 'вартість актуальна';
            return `вартість ${item.name} - ${priceText}`;
        }).join(', ');
        
        const term = deliveryTerm || '7-10 робочих днів';
        
        return `
Доброго дня!

Отримали актуальну інформацію стосовно вашого запиту, ${itemsText}, товар у наявності. Підтверджуєте дане замовлення?, терміни доставки: під замовлення (${term}). Бажаєте замовити?
        `.trim();
    },

    unavailable: (order, date) => `
Дата: ${date}

Доброго дня!

На жаль, деякі товари з замовлення №${order.orderNumber} тимчасово недоступні:

${order.items.map(item => `- ${item.name} (${item.quantity} шт) - НЕДОСТУПНИЙ`).join('\n')}

Прошу вибачення за незручності. Повідомимо про надходження.
    `.trim(),

    payment_question: (order, date) => `
Дата: ${date}

Доброго дня!

Щодо оплати замовлення №${order.orderNumber}:

${order.items.map(item => `- ${item.name}: ${item.price} грн × ${item.quantity} = ${item.price * item.quantity} грн`).join('\n')}

Загальна сума: ${order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)} грн

Як зручніше оплатити? Готівка, картка або переказ?
    `.trim(),

    price_terms: (order, date) => `
Дата: ${date}

Доброго дня!

Уточнення ціни та термінів для замовлення №${order.orderNumber}:

${order.items.map(item => `- ${item.name}: ${item.price} грн за шт (${item.quantity} шт = ${item.price * item.quantity} грн)`).join('\n')}

Загальна сума: ${order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)} грн
Термін виконання: 2-3 робочі дні
Доставка: за домовленістю

Чи підходять ці умови?
    `.trim(),

    prom_payment: (order, date) => `
Дата: ${date}

Доброго дня!

Для оплати замовлення №${order.orderNumber} через Prom:

Сума до оплати: ${order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)} грн

Будь ласка, оплатіть через систему Prom.ua. 
Після підтвердження оплати - негайно приступимо до комплектації.

Дякую!
    `.trim(),

    advance_payment: (order, date) => `
Дата: ${date}

Доброго дня!

Для замовлення №${order.orderNumber} потрібна передоплата 7%:

Загальна сума замовлення: ${order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)} грн
Сума авансу (7%): ${Math.round(order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 0.07)} грн

Після внесення авансу - резервуємо товар і почнемо підготовку.
Решту доплачуєте при отриманні.

Реквізити для авансу надішлю окремо.
    `.trim()
};

// Generate and copy text
function generateText(templateType) {
    if (!window.currentOrder) {
        showMessage('Помилка: замовлення не вибрано', 'error');
        return;
    }

    // Show delivery terms selection for order_only template
    if (templateType === 'order_only') {
        const deliverySection = document.getElementById('delivery-terms-section');
        if (deliverySection.style.display === 'none') {
            deliverySection.style.display = 'block';
            showMessage('Оберіть терміни доставки перед генерацією тексту', 'error');
            return;
        }
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
            generatedText = textTemplates[templateType](window.currentOrder, currentDate, originalPrices, deliveryTerm);
        } else {
            generatedText = textTemplates[templateType](window.currentOrder, currentDate, originalPrices);
        }
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
    
    // Hide delivery terms section after generation
    if (templateType === 'order_only') {
        document.getElementById('delivery-terms-section').style.display = 'none';
    }
}

// Get selected delivery term
function getSelectedDeliveryTerm() {
    const selectedRadio = document.querySelector('input[name="delivery-term"]:checked');
    if (selectedRadio.value === 'custom') {
        const customTerm = document.getElementById('custom-delivery-term').value.trim();
        return customTerm || '7-10 робочих днів';
    }
    return selectedRadio.value;
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