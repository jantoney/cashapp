// filepath: d:\DevWork\Cashapp\js\categories.js
import { showToast, markUnsavedChanges } from './utils.js';
import { fsCategoriesDocRef, onSnapshot, setDoc } from './firebase-config.js';

// Store categories array
let categories = [
  // Default categories with predefined colors and icons
  { id: 'income', name: 'Income', color: '#4CC9F0', icon: 'fa-dollar-sign' },
  { id: 'housing', name: 'Housing', color: '#F72585', icon: 'fa-home' },
  { id: 'food', name: 'Food', color: '#4361EE', icon: 'fa-utensils' },
  { id: 'transportation', name: 'Transportation', color: '#3F37C9', icon: 'fa-car' },
  { id: 'utilities', name: 'Utilities', color: '#F8961E', icon: 'fa-bolt' },
  { id: 'entertainment', name: 'Entertainment', color: '#FB5607', icon: 'fa-film' },
  { id: 'other', name: 'Other', color: '#6c757d', icon: 'fa-tag' }
];

// Function to create a new category
function createCategory(name, color, icon) {
  // Generate a unique ID based on the name
  const id = name.toLowerCase().replace(/\s+/g, '-');
  
  // Check if category with this ID already exists
  const existingIndex = categories.findIndex(cat => cat.id === id);
  if (existingIndex >= 0) {
    showToast(`Category "${name}" already exists.`);
    return null;
  }
  
  const newCategory = { id, name, color, icon };
  categories.push(newCategory);
  markUnsavedChanges();
  return newCategory;
}

// Function to update an existing category
function updateCategory(id, name, color, icon) {
  const index = categories.findIndex(cat => cat.id === id);
  if (index === -1) return false;
  
  categories[index] = { ...categories[index], name, color, icon };
  markUnsavedChanges();
  return true;
}

// Function to delete a category
function deleteCategory(id) {
  const index = categories.findIndex(cat => cat.id === id);
  if (index === -1) return false;
  
  categories.splice(index, 1);
  markUnsavedChanges();
  return true;
}

// Get all categories
function getCategories() {
  return [...categories];
}

// Get a specific category by ID
function getCategoryById(id) {
  return categories.find(cat => cat.id === id) || null;
}

// Create category management UI in a modal
function createCategoryModal() {
  // Check if modal already exists
  if (document.getElementById('categoryModal')) return;
  
  const modalHtml = `
    <div id="categoryModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h4>Manage Categories</h4>
          <span class="close-modal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="categoryName">Category Name</label>
            <input type="text" id="categoryName" class="form-control" placeholder="e.g. Groceries">
          </div>
          <div class="form-group">
            <label for="categoryColor">Color</label>
            <input type="color" id="categoryColor" class="form-control color-picker" value="#3f37c9">
          </div>
          <div class="form-group">
            <label for="categoryIcon">Icon (Font Awesome class)</label>
            <div class="d-flex align-items-center">
              <input type="text" id="categoryIcon" class="form-control" placeholder="fa-shopping-cart">
              <div class="icon-preview ml-10">
                <i id="iconPreview" class="fas fa-tag"></i>
              </div>
            </div>
          </div>
          
          <button id="addCategoryBtn" class="btn btn-success mb-20">
            <i class="fas fa-plus"></i> Add Category
          </button>
          
          <div class="form-actions mb-20">
            <button id="loadCategoriesBtn" class="btn btn-primary">
              <i class="fas fa-cloud-download-alt"></i> Load from Cloud
            </button>
          </div>
          
          <h5>Existing Categories</h5>
          <div id="categoriesList" class="categories-list">
            <!-- Categories will be populated here -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);
  
  // Set up event listeners
  document.querySelector('#categoryModal .close-modal').addEventListener('click', closeCategoryModal);
  document.getElementById('addCategoryBtn').addEventListener('click', handleAddCategory);
  document.getElementById('loadCategoriesBtn').addEventListener('click', loadCategoriesFromFirestore);
  
  // Preview icon as user types
  document.getElementById('categoryIcon').addEventListener('input', previewIcon);
  
  // Initial categories list populate
  updateCategoriesList();
}

// Update the categories list in the modal
function updateCategoriesList() {
  const categoriesList = document.getElementById('categoriesList');
  if (!categoriesList) return;
  
  categoriesList.innerHTML = '';
  
  categories.forEach(category => {
    const categoryEl = document.createElement('div');
    categoryEl.className = 'category-item';
    categoryEl.innerHTML = `
      <div class="category-color" style="background-color: ${category.color}">
        <i class="fas ${category.icon}"></i>
      </div>
      <div class="category-name">${category.name}</div>
      <div class="category-actions">
        <button class="btn btn-sm edit-category-btn" data-id="${category.id}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm delete-category-btn" data-id="${category.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    categoriesList.appendChild(categoryEl);
  });
  
  // Add event listeners to edit and delete buttons
  document.querySelectorAll('.edit-category-btn').forEach(btn => {
    btn.addEventListener('click', () => editCategory(btn.getAttribute('data-id')));
  });
  
  document.querySelectorAll('.delete-category-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteCategory(btn.getAttribute('data-id')));
  });
}

// Show the icon preview
function previewIcon() {
  const iconInput = document.getElementById('categoryIcon');
  const iconPreview = document.getElementById('iconPreview');
  
  if (iconInput.value) {
    iconPreview.className = `fas ${iconInput.value}`;
  } else {
    iconPreview.className = 'fas fa-tag';
  }
}

// Handle adding a new category
function handleAddCategory() {
  const nameInput = document.getElementById('categoryName');
  const colorInput = document.getElementById('categoryColor');
  const iconInput = document.getElementById('categoryIcon');
  
  const name = nameInput.value.trim();
  const color = colorInput.value;
  const icon = iconInput.value.trim() || 'fa-tag';
  
  if (!name) {
    showToast('Please enter a category name.');
    return;
  }
  
  const newCategory = createCategory(name, color, icon);
  if (newCategory) {
    updateCategoriesList();
    
    // Reset form
    nameInput.value = '';
    colorInput.value = '#3f37c9';
    iconInput.value = '';
    document.getElementById('iconPreview').className = 'fas fa-tag';
    
    showToast(`Category "${name}" added.`);
  }
}

// Edit a category
function editCategory(id) {
  const category = getCategoryById(id);
  if (!category) return;
  
  const nameInput = document.getElementById('categoryName');
  const colorInput = document.getElementById('categoryColor');
  const iconInput = document.getElementById('categoryIcon');
  const addBtn = document.getElementById('addCategoryBtn');
  
  // Populate form with category data
  nameInput.value = category.name;
  colorInput.value = category.color;
  iconInput.value = category.icon;
  
  // Show icon preview
  document.getElementById('iconPreview').className = `fas ${category.icon}`;
  
  // Change button to update mode
  addBtn.innerHTML = '<i class="fas fa-save"></i> Update Category';
  addBtn.classList.remove('btn-success');
  addBtn.classList.add('btn-primary');
  
  // Store the category ID being edited
  addBtn.setAttribute('data-editing', id);
  
  // Replace click handler
  addBtn.removeEventListener('click', handleAddCategory);
  addBtn.addEventListener('click', handleUpdateCategory);
}

// Handle updating a category
function handleUpdateCategory() {
  const addBtn = document.getElementById('addCategoryBtn');
  const id = addBtn.getAttribute('data-editing');
  
  const nameInput = document.getElementById('categoryName');
  const colorInput = document.getElementById('categoryColor');
  const iconInput = document.getElementById('categoryIcon');
  
  const name = nameInput.value.trim();
  const color = colorInput.value;
  const icon = iconInput.value.trim() || 'fa-tag';
  
  if (!name) {
    showToast('Please enter a category name.');
    return;
  }
  
  const updated = updateCategory(id, name, color, icon);
  if (updated) {
    updateCategoriesList();
    
    // Reset form and button
    nameInput.value = '';
    colorInput.value = '#3f37c9';
    iconInput.value = '';
    document.getElementById('iconPreview').className = 'fas fa-tag';
    
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Category';
    addBtn.classList.remove('btn-primary');
    addBtn.classList.add('btn-success');
    addBtn.removeAttribute('data-editing');
    
    // Restore original click handler
    addBtn.removeEventListener('click', handleUpdateCategory);
    addBtn.addEventListener('click', handleAddCategory);
    
    showToast(`Category "${name}" updated.`);
  }
}

// Confirm delete category
function confirmDeleteCategory(id) {
  const category = getCategoryById(id);
  if (!category) return;
  
  if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
    if (deleteCategory(id)) {
      updateCategoriesList();
      showToast(`Category "${category.name}" deleted.`);
    }
  }
}

// Open the category modal
function openCategoryModal() {
  createCategoryModal();
  const modal = document.getElementById('categoryModal');
  modal.style.display = 'block';
}

// Close the category modal
function closeCategoryModal() {
  const modal = document.getElementById('categoryModal');
  modal.style.display = 'none';
}

// Create a dropdown menu to select a category
function createCategoryDropdown(containerId, selectedCategoryId = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  // Create a custom dropdown container
  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = 'custom-dropdown-container';
  
  // Create the custom display that shows the selected option with icon
  const selectedDisplay = document.createElement('div');
  selectedDisplay.className = 'selected-category-display';
  
  // Create the custom dropdown list
  const customDropdownList = document.createElement('div');
  customDropdownList.className = 'custom-dropdown-list';
  
  // Add empty option to the dropdown list
  const emptyOption = document.createElement('div');
  emptyOption.className = 'dropdown-item';
  emptyOption.setAttribute('data-value', '');
  emptyOption.innerHTML = `<span class="placeholder">Select a category...</span>`;
  customDropdownList.appendChild(emptyOption);
  
  // Add all categories to the dropdown list
  categories.forEach(category => {
    const option = document.createElement('div');
    option.className = 'dropdown-item';
    option.setAttribute('data-value', category.id);
    option.innerHTML = `
      <div class="category-icon-container" style="background-color: ${category.color}">
        <i class="fas ${category.icon}"></i>
      </div>
      <span class="category-name">${category.name}</span>
    `;
    
    if (category.id === selectedCategoryId) {
      option.classList.add('selected');
    }
    customDropdownList.appendChild(option);
  });
  
  // Create a hidden select element for form submission
  const select = document.createElement('select');
  select.className = 'form-control category-select visually-hidden';
  select.name = `category-${containerId}`;
  
  // Add empty option
  const emptySelectOption = document.createElement('option');
  emptySelectOption.value = '';
  emptySelectOption.textContent = 'Select a category...';
  select.appendChild(emptySelectOption);
  
  // Add all categories
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    if (category.id === selectedCategoryId) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  // Update the selected display based on the current selection
  const updateSelectedDisplay = (categoryId) => {
    if (categoryId) {
      const category = getCategoryById(categoryId);
      selectedDisplay.innerHTML = `
        <div class="category-icon-container" style="background-color: ${category.color}">
          <i class="fas ${category.icon}"></i>
        </div>
        <span class="category-name">${category.name}</span>
      `;
    } else {
      selectedDisplay.innerHTML = '<span class="placeholder">Select a category...</span>';
    }
  };
  
  // Initialize selected display
  updateSelectedDisplay(selectedCategoryId);
  
  // Toggle dropdown visibility when clicking on the selected display
  selectedDisplay.addEventListener('click', () => {
    customDropdownList.classList.toggle('show');
  });
  
  // Handle dropdown item selection
  customDropdownList.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      const value = item.getAttribute('data-value');
      
      // Update hidden select
      select.value = value;
      
      // Trigger change event on select
      const event = new Event('change', { bubbles: true });
      select.dispatchEvent(event);
      
      // Update selected display
      updateSelectedDisplay(value);
      
      // Update visual selection
      customDropdownList.querySelectorAll('.dropdown-item').forEach(i => {
        i.classList.remove('selected');
      });
      item.classList.add('selected');
      
      // Hide dropdown
      customDropdownList.classList.remove('show');
    });
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownContainer.contains(e.target)) {
      customDropdownList.classList.remove('show');
    }
  });
  
  // Add elements to the container
  dropdownContainer.appendChild(selectedDisplay);
  dropdownContainer.appendChild(customDropdownList);
  dropdownContainer.appendChild(select);
  container.appendChild(dropdownContainer);
  
  return select;
}

// Save categories to Firestore
async function saveCategoriesToFirestore() {
  try {
    await setDoc(fsCategoriesDocRef, { categories });
    showToast('Categories saved to Cloud successfully.');
  } catch (err) {
    console.error("Error saving categories to Firestore:", err);
    showToast(`Error saving categories: ${err.message}`);
  }
}

// Load categories from Firestore
function loadCategoriesFromFirestore() {
  onSnapshot(fsCategoriesDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const firestoreCategories = docSnap.data().categories || [];
      
      // Replace the current categories array with the loaded data
      categories.length = 0;
      firestoreCategories.forEach(cat => categories.push(cat));
      
      // Update the UI
      updateCategoriesList();
      
      // Update any open category dropdowns in the app
      refreshAllCategoryDropdowns();
      
      showToast('Categories loaded from Cloud.');
    } else {
      // If no document exists, create one with default categories
      saveCategoriesToFirestore();
    }
  }, (error) => {
    console.error("Error loading categories:", error);
    showToast(`Error loading categories: ${error.message}`);
  });
}

// Refresh all category dropdowns in the app
function refreshAllCategoryDropdowns() {
  // Refresh the main transaction form dropdowns
  createCategoryDropdown('recurringCategoryContainer');
  createCategoryDropdown('oneoffCategoryContainer');
  
  // Also refresh the edit modal dropdown if it's open
  const editModal = document.getElementById('editTransactionModal');
  if (editModal && window.getComputedStyle(editModal).display !== 'none') {
    const selectedCategoryId = document.querySelector('#editCategoryContainer select')?.value;
    createCategoryDropdown('editCategoryContainer', selectedCategoryId);
  }
}

// Initialize categories on app load
function initializeCategories() {
  // Try to load from Firestore
  loadCategoriesFromFirestore();
}

// Export functions
export { 
  getCategories, 
  getCategoryById, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  openCategoryModal,
  createCategoryDropdown,
  createCategoryModal,
  initializeCategories,
  categories,
  saveCategoriesToFirestore
};