// Категории страниц и их ключевые слова
const pageCategories = {
    about: ['about', 'о компании', 'о нас', 'about us', 'компания'],
    contacts: ['contact', 'контакты', 'адрес', 'contacts', 'связаться'],
    products: ['product', 'продукты', 'продукция', 'каталог', 'catalog', 'товары'],
    services: ['service', 'услуги', 'сервис', 'services']
};

// Определить категорию страницы
const getPageCategory = (url) => {
    const urlLower = url.toLowerCase();
    for (const [category, keywords] of Object.entries(pageCategories)) {
        if (keywords.some(keyword => urlLower.includes(keyword))) {
            return category;
        }
    }
    return null;
};

// Преобразование списка URL в древовидную структуру
const buildUrlTree = (urls, baseUrl) => {
    console.log(`Построение дерева URL для ${urls.length} URL-адресов с базовым URL: ${baseUrl}`);
    const tree = [];
    const nodeMap = {};
    
    // Создаем корневой узел для базового URL
    const rootNode = {
        id: 'root',
        text: new URL(baseUrl).hostname,
        children: [],
        type: 'root',
        state: { opened: true },
        li_attr: {
            'data-url': baseUrl, // Явно задаем URL для корневого узла
            'data-is-root': 'true'
        },
        a_attr: {
            href: baseUrl, // Явно задаем href для корневого узла
            title: `Главная страница - ${baseUrl}`
        },
        // Добавляем URL в обоих местах для совместимости
        original: { url: baseUrl },
        data: { url: baseUrl }
    };
    nodeMap['root'] = rootNode;
    tree.push(rootNode);
    console.log(`Создан корневой узел с id: 'root', text: '${rootNode.text}'`);
    
    urls.forEach(url => {
        // Получаем относительный путь
        const relativePath = url.replace(baseUrl, '');
        if (!relativePath) {
            console.log(`Пропускаем URL: ${url} (совпадает с базовым URL)`);
            return;
        }
        
        // Разбиваем путь на сегменты
        const segments = relativePath.split('/').filter(s => s);
        console.log(`URL: ${url}, сегменты: ${JSON.stringify(segments)}`);
        
        let parentId = 'root';
        let currentPath = '';
        
        // Создаем узлы для каждого сегмента пути
        segments.forEach((segment, index) => {
            currentPath += '/' + segment;
            const isLeaf = index === segments.length - 1;
            const nodeId = currentPath;
            
            // Если узел уже существует, пропускаем его создание
            if (!nodeMap[nodeId]) {
                const category = isLeaf ? getPageCategory(url) : null;
                const nodeText = isLeaf ? segment.replace(/[-_]/g, ' ').replace(/\.\w+$/, '').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : segment;
                
                // Создаем URL для категории на основе базового URL и текущего пути
                const nodeUrl = isLeaf ? url : (baseUrl + currentPath);
                
                const node = {
                    id: nodeId,
                    text: nodeText,
                    parent: parentId,
                    type: isLeaf ? 'page' : 'folder',
                    li_attr: {
                        'data-url': nodeUrl, // Устанавливаем URL для всех узлов (категорий и страниц)
                        'data-category': category
                    },
                    a_attr: {
                        href: nodeUrl, // Используем реальный URL вместо javascript:void(0)
                        title: nodeUrl // Используем актуальный URL узла
                    }
                };
                
                console.log(`Создан узел: id=${nodeId}, text=${nodeText}, type=${isLeaf ? 'page' : 'folder'}, parent=${parentId}`);
                
                // Добавляем узел в карту и в дерево
                nodeMap[nodeId] = node;
                if (!nodeMap[parentId].children) {
                    nodeMap[parentId].children = [];
                }
                nodeMap[parentId].children.push(node);
            } else {
                console.log(`Узел с id=${nodeId} уже существует, пропускаем его создание`);
            }
            
            parentId = nodeId;
        });
    });
    
    console.log(`Построено дерево с ${Object.keys(nodeMap).length} узлами`);
    return tree;
};

// Экспортируем константы и функции
export { pageCategories, getPageCategory, buildUrlTree };