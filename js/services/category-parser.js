/**
 * Special handling for category pages
 */

// Function to detect if a URL is a category page
function isCategoryPage(url) {
    try {
        const urlObj = new URL(url);
        // Homepage is ALWAYS considered a category page
        if (urlObj.pathname === "/" || urlObj.pathname === "") {
            return true; // Homepage is always a category
        }
        // Count path segments
        const segments = urlObj.pathname.split('/').filter(Boolean);
        // Categories usually have 1-2 path segments
        return segments.length >= 1 && segments.length <= 3;
    } catch (e) {
        console.error('Invalid URL in category check:', url);
        return false;
    }
}

// Enhanced parser for category pages that extracts more useful information
async function parseCategoryPage(url, html) {
    console.log('Special parsing for category page:', url);
    
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Check if this is a homepage
    const isHomepage = new URL(url).pathname === "/" || new URL(url).pathname === "";
    
    // Extract useful information from the category page
    const result = {
        type: 'category', // Always a category, homepage is just a special kind of category
        url: url,
        title: doc.title || 'Category Page',
        description: '',
        products: [],
        subcategories: [],
        metadata: {},
        isHomepage: isHomepage // Flag to indicate if this is the main category (homepage)
    };
    
    // Homepage specific parsing if needed
    if (isHomepage) {
        console.log('Parsing main category page (homepage):', url);
        
        // Try to find main content sections on homepage
        const mainContentSelectors = [
            'main', '#main', '.main-content', '#content', 
            '.home-content', '.page-content'
        ];
        
        for (const selector of mainContentSelectors) {
            const mainContent = doc.querySelector(selector);
            if (mainContent) {
                result.mainContent = mainContent.textContent.trim().substring(0, 1000) + '...';
                break;
            }
        }
        
        // Try to find featured sections, banners, etc.
        result.sections = [];
        const sectionSelectors = [
            '.hero', '.banner', '.featured', '.showcase',
            '.slider', '.carousel', '.highlights', '.promotion'
        ];
        
        for (const selector of sectionSelectors) {
            const sections = doc.querySelectorAll(selector);
            if (sections.length > 0) {
                sections.forEach(section => {
                    let sectionContent = section.textContent.trim();
                    result.sections.push({
                        type: selector.replace('.', ''),
                        content: sectionContent.substring(0, 200) + (sectionContent.length > 200 ? '...' : '')
                    });
                });
            }
        }
    }
    
    // Try to find category description - common selectors for descriptions
    const descriptionSelectors = [
        'meta[name="description"]',
        '.category-description',
        '.category-content',
        '#category-description',
        '.description',
        '.intro-text'
    ];
    
    for (const selector of descriptionSelectors) {
        const element = selector.startsWith('meta') ? 
            doc.querySelector(selector) : 
            doc.querySelector(selector);
            
        if (element) {
            if (selector.startsWith('meta')) {
                result.description = element.getAttribute('content');
            } else {
                result.description = element.textContent.trim();
            }
            break;
        }
    }
    
    // Try to find product listings - this varies by site
    const productSelectors = [
        '.product', '.item', '.product-item', '.product-card',
        '[data-product-id]', '[data-product]'
    ];
    
    for (const selector of productSelectors) {
        const products = doc.querySelectorAll(selector);
        if (products.length > 0) {
            products.forEach(product => {
                // Extract product info
                const productData = {
                    name: '',
                    price: '',
                    url: ''
                };
                
                // Find product name
                const nameEl = product.querySelector('.product-name, .name, .title, h3, h2');
                if (nameEl) {
                    productData.name = nameEl.textContent.trim();
                }
                
                // Find product price
                const priceEl = product.querySelector('.price, .product-price, .amount');
                if (priceEl) {
                    productData.price = priceEl.textContent.trim();
                }
                
                // Find product URL
                const linkEl = product.querySelector('a[href]');
                if (linkEl) {
                    productData.url = new URL(linkEl.getAttribute('href'), url).href;
                }
                
                if (productData.name) {
                    result.products.push(productData);
                }
            });
            break;
        }
    }
    
    // Find subcategories
    const subcategorySelectors = [
        '.subcategory', '.category-list a', '.categories a', '.subcategories a'
    ];
    
    for (const selector of subcategorySelectors) {
        const subcategories = doc.querySelectorAll(selector);
        if (subcategories.length > 0) {
            subcategories.forEach(subcat => {
                if (subcat.tagName === 'A' && subcat.href) {
                    result.subcategories.push({
                        name: subcat.textContent.trim(),
                        url: new URL(subcat.getAttribute('href'), url).href
                    });
                }
            });
            break;
        }
    }
    
    // Find additional metadata
    try {
        // Extract structured data if available
        const structuredDataElements = doc.querySelectorAll('script[type="application/ld+json"]');
        structuredDataElements.forEach(el => {
            try {
                const data = JSON.parse(el.textContent);
                if (data) {
                    result.metadata.structuredData = data;
                }
            } catch (e) {
                console.warn('Failed to parse structured data:', e);
            }
        });
        
        // Extract OpenGraph metadata
        const ogElements = doc.querySelectorAll('meta[property^="og:"]');
        const ogData = {};
        ogElements.forEach(el => {
            const property = el.getAttribute('property').substring(3);
            const content = el.getAttribute('content');
            if (property && content) {
                ogData[property] = content;
            }
        });
        if (Object.keys(ogData).length) {
            result.metadata.openGraph = ogData;
        }
    } catch (e) {
        console.warn('Error extracting metadata:', e);
    }
    
    return result;
}

// Expose functions
window.categoryParser = {
    isCategoryPage,
    parseCategoryPage
};
