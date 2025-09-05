// Sistema de Vendas - JavaScript com Backend
class SistemaVendas {
    constructor() {
        this.API_BASE = '/api';
        this.currentUser = null;
        this.isAuthenticated = false;
        
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.updateDateTime();
        
        // Atualizar data/hora a cada minuto
        setInterval(() => this.updateDateTime(), 60000);
    }

    async checkAuthentication() {
        try {
            const response = await fetch(`${this.API_BASE}/auth/check`);
            const data = await response.json();
            
            if (data.success && data.authenticated) {
                this.currentUser = data.user;
                this.isAuthenticated = true;
                this.showMainApp();
                await this.loadDashboard();
            } else {
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            this.showLoginScreen();
        }
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // Formulário de produtos
        document.getElementById('formProduto').addEventListener('submit', (e) => {
            e.preventDefault();
            this.adicionarProduto();
        });

        document.getElementById('limparProduto').addEventListener('click', () => {
            this.limparFormularioProduto();
        });

        // Formulário de vendas
        document.getElementById('formVenda').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registrarVenda();
        });

        document.getElementById('limparVenda').addEventListener('click', () => {
            this.limparFormularioVenda();
        });

        // Calcular valor total da venda
        document.getElementById('produtoVenda').addEventListener('change', () => {
            this.calcularValorTotal();
        });

        document.getElementById('quantidadeVenda').addEventListener('input', () => {
            this.calcularValorTotal();
        });

        // Modal
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal();
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorDiv = document.getElementById('loginError');

        if (!username || !password) {
            this.showLoginError('Por favor, preencha todos os campos');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                this.isAuthenticated = true;
                this.showMainApp();
                await this.loadDashboard();
                this.showToast('Login realizado com sucesso!', 'success');
            } else {
                this.showLoginError(data.message || 'Erro ao fazer login');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showLoginError('Erro de conexão. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleLogout() {
        this.showLoading(true);

        try {
            await fetch(`${this.API_BASE}/auth/logout`, {
                method: 'POST'
            });

            this.currentUser = null;
            this.isAuthenticated = false;
            this.showLoginScreen();
            this.showToast('Logout realizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            this.showLoading(false);
        }
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('loginError').style.display = 'none';
    }

    showMainApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('currentUser').textContent = this.currentUser;
    }

    showLoginError(message) {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }

    updateDateTime() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        document.getElementById('currentDateTime').textContent = 
            now.toLocaleDateString('pt-BR', options);
    }

    showSection(sectionName) {
        // Atualizar navegação
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Mostrar seção
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        // Carregar dados específicos da seção
        switch(sectionName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'vendas':
                this.loadProdutosParaVenda();
                break;
            case 'pagamentos':
                this.loadPagamentos();
                break;
            case 'estoque':
                this.loadEstoque();
                break;
            case 'estatisticas':
                this.loadEstatisticas();
                break;
        }
    }

    // API calls
    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.API_BASE}${endpoint}`, options);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Erro na API');
            }

            return result;
        } catch (error) {
            console.error(`Erro na API ${endpoint}:`, error);
            throw error;
        }
    }

    async getProducts() {
        try {
            const result = await this.apiCall('/github/produtos');
            return result.produtos || [];
        } catch (error) {
            this.showToast('Erro ao carregar produtos', 'error');
            return [];
        }
    }

    async saveProducts(products) {
        try {
            await this.apiCall('/github/produtos', 'POST', { produtos: products });
            return true;
        } catch (error) {
            this.showToast('Erro ao salvar produtos', 'error');
            return false;
        }
    }

    async getSales() {
        try {
            const result = await this.apiCall('/github/vendas');
            return result.vendas || [];
        } catch (error) {
            this.showToast('Erro ao carregar vendas', 'error');
            return [];
        }
    }

    async saveSales(sales) {
        try {
            await this.apiCall('/github/vendas', 'POST', { vendas: sales });
            return true;
        } catch (error) {
            this.showToast('Erro ao salvar vendas', 'error');
            return false;
        }
    }

    async getClients() {
        try {
            const result = await this.apiCall('/github/clientes');
            return result.clientes || {};
        } catch (error) {
            this.showToast('Erro ao carregar clientes', 'error');
            return {};
        }
    }

    async saveClients(clients) {
        try {
            await this.apiCall('/github/clientes', 'POST', { clientes: clients });
            return true;
        } catch (error) {
            this.showToast('Erro ao salvar clientes', 'error');
            return false;
        }
    }

    // Produtos
    async adicionarProduto() {
        const nome = document.getElementById('nomeProduto').value.trim();
        const quantidade = parseInt(document.getElementById('quantidadeProduto').value);
        const preco = parseFloat(document.getElementById('precoProduto').value);

        if (!this.validarProduto(nome, quantidade, preco)) {
            return;
        }

        this.showLoading(true);

        try {
            let products = await this.getProducts();
            const existingProductIndex = products.findIndex(p => 
                p.nome.toLowerCase() === nome.toLowerCase()
            );

            const now = new Date().toLocaleString('pt-BR');

            if (existingProductIndex !== -1) {
                // Produto existe, atualizar quantidade e preço
                products[existingProductIndex].quantidade += quantidade;
                products[existingProductIndex].preco = preco;
                products[existingProductIndex].dataAtualizacao = now;
            } else {
                // Novo produto
                products.push({
                    id: Date.now(),
                    nome,
                    quantidade,
                    preco,
                    dataCriacao: now,
                    dataAtualizacao: now
                });
            }

            const success = await this.saveProducts(products);
            if (success) {
                this.showToast('Produto salvo com sucesso!', 'success');
                this.limparFormularioProduto();
                
                // Atualizar dashboard se estiver ativo
                if (document.getElementById('dashboard').classList.contains('active')) {
                    await this.loadDashboard();
                }
            }
        } catch (error) {
            this.showToast('Erro ao salvar produto', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    validarProduto(nome, quantidade, preco) {
        if (!nome) {
            this.showToast('Informe o nome do produto!', 'error');
            return false;
        }
        if (isNaN(quantidade) || quantidade <= 0) {
            this.showToast('Informe uma quantidade válida!', 'error');
            return false;
        }
        if (isNaN(preco) || preco <= 0) {
            this.showToast('Informe um preço válido!', 'error');
            return false;
        }
        return true;
    }

    limparFormularioProduto() {
        document.getElementById('nomeProduto').value = '';
        document.getElementById('quantidadeProduto').value = '';
        document.getElementById('precoProduto').value = '';
    }

    // Vendas
    async loadProdutosParaVenda() {
        const products = await this.getProducts();
        const select = document.getElementById('produtoVenda');
        
        select.innerHTML = '<option value="">Selecione um produto</option>';
        
        products.forEach(product => {
            if (product.quantidade > 0) {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.nome} (Estoque: ${product.quantidade}) - R$ ${product.preco.toFixed(2)}`;
                option.dataset.preco = product.preco;
                option.dataset.estoque = product.quantidade;
                select.appendChild(option);
            }
        });

        this.calcularValorTotal();
    }

    calcularValorTotal() {
        const select = document.getElementById('produtoVenda');
        const quantidade = parseInt(document.getElementById('quantidadeVenda').value) || 0;
        const selectedOption = select.options[select.selectedIndex];
        
        let valorTotal = 0;
        if (selectedOption && selectedOption.dataset.preco) {
            const preco = parseFloat(selectedOption.dataset.preco);
            valorTotal = quantidade * preco;
        }
        
        document.getElementById('valorTotalVenda').textContent = `R$ ${valorTotal.toFixed(2)}`;
    }

    async registrarVenda() {
        const cliente = document.getElementById('nomeCliente').value.trim();
        const produtoId = document.getElementById('produtoVenda').value;
        const quantidade = parseInt(document.getElementById('quantidadeVenda').value);

        if (!this.validarVenda(cliente, produtoId, quantidade)) {
            return;
        }

        this.showLoading(true);

        try {
            const products = await this.getProducts();
            const productIndex = products.findIndex(p => p.id == produtoId);
            const product = products[productIndex];

            if (quantidade > product.quantidade) {
                this.showToast(`Estoque insuficiente! Disponível: ${product.quantidade}`, 'error');
                return;
            }

            // Atualizar estoque
            products[productIndex].quantidade -= quantidade;
            await this.saveProducts(products);

            // Registrar venda
            const sales = await this.getSales();
            const venda = {
                id: Date.now(),
                cliente,
                produtoId: product.id,
                produtoNome: product.nome,
                quantidade,
                precoUnitario: product.preco,
                valorTotal: quantidade * product.preco,
                data: new Date().toISOString(),
                status: 'EM_DIVIDA'
            };

            sales.push(venda);
            await this.saveSales(sales);

            // Atualizar dados do cliente
            await this.atualizarDadosCliente(cliente, venda);

            this.showToast('Venda registrada com sucesso!', 'success');
            this.limparFormularioVenda();
            await this.loadProdutosParaVenda();
        } catch (error) {
            this.showToast('Erro ao registrar venda', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    validarVenda(cliente, produtoId, quantidade) {
        if (!cliente) {
            this.showToast('Informe o nome do cliente!', 'error');
            return false;
        }
        if (!produtoId) {
            this.showToast('Selecione um produto!', 'error');
            return false;
        }
        if (isNaN(quantidade) || quantidade <= 0) {
            this.showToast('Informe uma quantidade válida!', 'error');
            return false;
        }
        return true;
    }

    async atualizarDadosCliente(nomeCliente, venda) {
        const clients = await this.getClients();
        
        if (!clients[nomeCliente]) {
            clients[nomeCliente] = {
                nome: nomeCliente,
                vendas: [],
                totalDivida: 0,
                totalPago: 0
            };
        }

        clients[nomeCliente].vendas.push(venda.id);
        clients[nomeCliente].totalDivida += venda.valorTotal;

        await this.saveClients(clients);
    }

    limparFormularioVenda() {
        document.getElementById('nomeCliente').value = '';
        document.getElementById('produtoVenda').value = '';
        document.getElementById('quantidadeVenda').value = '';
        document.getElementById('valorTotalVenda').textContent = 'R$ 0,00';
    }

    // Dashboard
    async loadDashboard() {
        const sales = await this.getSales();
        const products = await this.getProducts();
        
        let totalVendas = 0;
        let totalDividas = 0;
        let totalRecebido = 0;
        let valorEstoque = 0;

        // Calcular totais das vendas
        sales.forEach(sale => {
            totalVendas += sale.valorTotal;
            if (sale.status === 'EM_DIVIDA') {
                totalDividas += sale.valorTotal;
            } else {
                totalRecebido += sale.valorTotal;
            }
        });

        // Calcular valor do estoque
        products.forEach(product => {
            valorEstoque += product.quantidade * product.preco;
        });

        // Atualizar cards de estatísticas
        document.getElementById('totalVendas').textContent = `R$ ${totalVendas.toFixed(2)}`;
        document.getElementById('totalDividas').textContent = `R$ ${totalDividas.toFixed(2)}`;
        document.getElementById('totalRecebido').textContent = `R$ ${totalRecebido.toFixed(2)}`;
        document.getElementById('valorEstoque').textContent = `R$ ${valorEstoque.toFixed(2)}`;

        // Carregar produtos com baixo estoque
        this.loadLowStockProducts(products);
        
        // Carregar últimas vendas
        this.loadRecentSales(sales);
    }

    loadLowStockProducts(products) {
        const lowStockProducts = products.filter(p => p.quantidade <= 5);
        const container = document.getElementById('lowStockProducts');
        
        container.innerHTML = '';
        
        if (lowStockProducts.length === 0) {
            container.innerHTML = '<p class="text-secondary">Nenhum produto com estoque baixo</p>';
            return;
        }

        lowStockProducts.forEach(product => {
            const item = document.createElement('div');
            item.className = 'list-item';
            item.innerHTML = `
                <div class="list-item-content">
                    <div class="list-item-title">${product.nome}</div>
                    <div class="list-item-subtitle">Estoque: ${product.quantidade} unidades</div>
                </div>
                <span class="status-badge status-baixo">Baixo</span>
            `;
            container.appendChild(item);
        });
    }

    loadRecentSales(sales) {
        const recentSales = sales.slice(-5).reverse();
        const container = document.getElementById('recentSales');
        
        container.innerHTML = '';
        
        if (recentSales.length === 0) {
            container.innerHTML = '<p class="text-secondary">Nenhuma venda registrada</p>';
            return;
        }

        recentSales.forEach(sale => {
            const item = document.createElement('div');
            item.className = 'list-item';
            const data = new Date(sale.data).toLocaleDateString('pt-BR');
            item.innerHTML = `
                <div class="list-item-content">
                    <div class="list-item-title">${sale.cliente}</div>
                    <div class="list-item-subtitle">${sale.produtoNome} - ${data}</div>
                </div>
                <span class="status-badge ${sale.status === 'PAGO' ? 'status-pago' : 'status-devendo'}">
                    R$ ${sale.valorTotal.toFixed(2)}
                </span>
            `;
            container.appendChild(item);
        });
    }

    // Pagamentos
    async loadPagamentos() {
        const clients = await this.getClients();
        const tbody = document.querySelector('#tabelaPagamentos tbody');
        
        tbody.innerHTML = '';
        
        Object.values(clients).forEach(client => {
            if (client.totalDivida > 0) {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${client.nome}</td>
                    <td>R$ ${client.totalDivida.toFixed(2)}</td>
                    <td>
                        <span class="status-badge status-devendo">Devendo</span>
                    </td>
                    <td>
                        <button class="btn btn-success btn-sm" onclick="sistema.marcarComoPago('${client.nome}')">
                            <i class="fas fa-check"></i> Marcar como Pago
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="sistema.verDetalhesCliente('${client.nome}')">
                            <i class="fas fa-eye"></i> Ver Detalhes
                        </button>
                    </td>
                `;
            }
        });
    }

    async marcarComoPago(nomeCliente) {
        this.showLoading(true);

        try {
            const clients = await this.getClients();
            const sales = await this.getSales();
            
            if (!clients[nomeCliente]) return;

            // Atualizar vendas do cliente
            clients[nomeCliente].vendas.forEach(vendaId => {
                const saleIndex = sales.findIndex(s => s.id === vendaId);
                if (saleIndex !== -1 && sales[saleIndex].status === 'EM_DIVIDA') {
                    sales[saleIndex].status = 'PAGO';
                    sales[saleIndex].dataPagamento = new Date().toISOString();
                }
            });

            // Atualizar dados do cliente
            clients[nomeCliente].totalPago += clients[nomeCliente].totalDivida;
            clients[nomeCliente].totalDivida = 0;

            await this.saveSales(sales);
            await this.saveClients(clients);
            
            this.showToast(`Pagamento de ${nomeCliente} registrado!`, 'success');
            await this.loadPagamentos();
            
            // Atualizar dashboard se estiver ativo
            if (document.getElementById('dashboard').classList.contains('active')) {
                await this.loadDashboard();
            }
        } catch (error) {
            this.showToast('Erro ao registrar pagamento', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async verDetalhesCliente(nomeCliente) {
        try {
            const clients = await this.getClients();
            const sales = await this.getSales();
            const client = clients[nomeCliente];
            
            if (!client) return;

            const clientSales = sales.filter(s => client.vendas.includes(s.id));
            
            let detalhes = `<h4>Histórico de Compras - ${nomeCliente}</h4><br>`;
            detalhes += `<table class="table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Valor</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>`;

            clientSales.forEach(sale => {
                const data = new Date(sale.data).toLocaleDateString('pt-BR');
                const status = sale.status === 'PAGO' ? 'Pago' : 'Devendo';
                detalhes += `
                    <tr>
                        <td>${data}</td>
                        <td>${sale.produtoNome}</td>
                        <td>${sale.quantidade}</td>
                        <td>R$ ${sale.valorTotal.toFixed(2)}</td>
                        <td><span class="status-badge ${sale.status === 'PAGO' ? 'status-pago' : 'status-devendo'}">${status}</span></td>
                    </tr>`;
            });

            detalhes += `</tbody></table>`;
            detalhes += `<br><strong>Total Pago: R$ ${client.totalPago.toFixed(2)}</strong><br>`;
            detalhes += `<strong>Total em Dívida: R$ ${client.totalDivida.toFixed(2)}</strong>`;

            this.showModal(`Detalhes - ${nomeCliente}`, detalhes);
        } catch (error) {
            this.showToast('Erro ao carregar detalhes do cliente', 'error');
        }
    }

    // Estoque
    async loadEstoque() {
        const products = await this.getProducts();
        const tbody = document.querySelector('#tabelaEstoque tbody');
        
        tbody.innerHTML = '';
        
        products.forEach(product => {
            const valorTotal = product.quantidade * product.preco;
            const status = product.quantidade <= 5 ? 'Baixo' : 'Normal';
            const statusClass = product.quantidade <= 5 ? 'status-baixo' : 'status-normal';
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${product.nome}</td>
                <td>${product.quantidade}</td>
                <td>R$ ${product.preco.toFixed(2)}</td>
                <td>R$ ${valorTotal.toFixed(2)}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
            `;
        });
    }

    // Estatísticas
    async loadEstatisticas() {
        const sales = await this.getSales();
        const tbody = document.querySelector('#tabelaEstatisticas tbody');
        
        tbody.innerHTML = '';
        
        sales.slice().reverse().forEach(sale => {
            const data = new Date(sale.data).toLocaleDateString('pt-BR');
            const status = sale.status === 'PAGO' ? 'Pago' : 'Devendo';
            const statusClass = sale.status === 'PAGO' ? 'status-pago' : 'status-devendo';
            
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${data}</td>
                <td>${sale.cliente}</td>
                <td>${sale.produtoNome}</td>
                <td>${sale.quantidade}</td>
                <td>R$ ${sale.valorTotal.toFixed(2)}</td>
                <td><span class="status-badge ${statusClass}">${status}</span></td>
            `;
        });
    }

    // Modal
    showModal(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalContent').innerHTML = content;
        document.getElementById('modalDetalhes').style.display = 'block';
    }

    closeModal() {
        document.getElementById('modalDetalhes').style.display = 'none';
    }

    // Toast notifications
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Adicionar animação de saída do toast
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Inicializar sistema quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.sistema = new SistemaVendas();
});

