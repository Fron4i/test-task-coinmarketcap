let coinsData = []
let sortState = { key: 'rank', dir: 'desc' }

const formatter = new Intl.NumberFormat('ru-RU', {
	style: 'currency',
	currency: 'RUB',
	minimumFractionDigits: 0,
})

async function loadCoins() {
	const res = await fetch('/coins')
	coinsData = await res.json()
	renderTable()
}

function renderTable() {
	const tbody = document.querySelector('#coins-body')
	tbody.innerHTML = ''

	const data = [...coinsData]
	const dir = sortState.dir === 'asc' ? 1 : -1
	data.sort((a, b) => {
		if (sortState.key === 'symbol') {
			return a.symbol.localeCompare(b.symbol) * dir
		}
		return (Number(a[sortState.key] || 0) - Number(b[sortState.key] || 0)) * dir
	})

	data.forEach((c, idx) => {
		const price = Number(c.price)
		const change = Number(c.change_24h)
		const marketCap = Number(c.market_cap)
		const volume = Number(c.volume_24h)

		const tr = document.createElement('tr')
		tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${c.symbol.toUpperCase()}</td>
      <td>${formatter.format(price)}</td>
      <td class="${change >= 0 ? 'change-positive' : 'change-negative'
			}">${change.toFixed(2)}%</td>
      <td>${formatter.format(marketCap)}</td>
      <td>${formatter.format(volume)}</td>
    `
		tbody.appendChild(tr)
	})
}

function attachSorting() {
	const headers = document.querySelectorAll('th.sortable')
	headers.forEach(th => {
		th.addEventListener('click', () => {
			const key = th.dataset.key
			if (sortState.key === key) {
				sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc'
			} else {
				sortState.key = key
				sortState.dir = 'desc'
			}

			headers.forEach(h => h.classList.remove('asc', 'desc'))
			th.classList.add(sortState.dir)

			renderTable()
		})
	})
}

document.addEventListener('DOMContentLoaded', () => {
	document.body.classList.add('dark-theme')
	const themeBtn = document.getElementById('theme-toggle')
	if (themeBtn) {
	}

	document.getElementById('refresh-btn').addEventListener('click', async () => {
		const res = await fetch('/refresh', { method: 'POST' })
		if (res.status === 429) {
			showToast('Слишком часто. Попробуйте позже', true)
			return
		}
		if (res.ok) {
			showToast('Данные успешно обновлены')
			await loadCoins()
		}
	})
	loadCoins()
	attachSorting()
	attachClickChart()

	themeBtn.addEventListener('click', () => {
		document.body.classList.toggle('dark-theme')

		const chartRow = document.querySelector('tr.chart-row')
		if (chartRow) {
			const prevTr = chartRow.previousSibling
			const symbol = prevTr.children[1].textContent.trim().toLowerCase()
			chartRow.remove()
			const newChartRow = document.createElement('tr')
			newChartRow.className = 'chart-row'
			const td = document.createElement('td')
			td.colSpan = 6
			td.innerHTML = '<canvas></canvas>'
			newChartRow.appendChild(td)
			prevTr.parentNode.insertBefore(newChartRow, prevTr.nextSibling)
			const canvas = td.querySelector('canvas')
			const ctx = canvas.getContext('2d')
			if (chartCache[symbol]) {
				drawInlineChart(ctx, chartCache[symbol])
			}
			if (window.setExpandedChartRow) window.setExpandedChartRow(newChartRow)
		}
	})
})

function showToast(message, isError = false) {
	const btn = document.getElementById('refresh-btn')
	const rect = btn.getBoundingClientRect()

	const toast = document.createElement('div')
	toast.className = 'toast'
	if (isError) toast.style.background = '#dc2626'
	toast.textContent = message
	document.body.appendChild(toast)

	const toastRect = toast.getBoundingClientRect()

	const top = rect.top + window.scrollY - toastRect.height - 10
	const left = rect.left + window.scrollX + rect.width / 2 - toastRect.width / 2

	toast.style.top = `${top}px`
	toast.style.left = `${left}px`

	void toast.offsetWidth
	toast.classList.add('show')

	setTimeout(() => {
		toast.classList.remove('show')
		setTimeout(() => toast.remove(), 300)
	}, 3000)
}

const chartCache = {}
let popupDiv = null

function createPopup() {
	popupDiv = document.createElement('div')
	popupDiv.className = 'chart-popup'
	popupDiv.innerHTML = '<canvas width="350" height="150"></canvas>'
	document.body.appendChild(popupDiv)
}

function attachClickChart() {
	let expandedRow
	document.querySelector('#coins-body').addEventListener('click', async e => {
		const tr = e.target.closest('tr')
		if (!tr || tr.classList.contains('chart-row')) return

		if (expandedRow && expandedRow !== tr.nextSibling) {
			expandedRow.remove()
			expandedRow = null
		}

		if (expandedRow === tr.nextSibling) {
			expandedRow.remove()
			expandedRow = null
			return
		}

		const symbol = tr.children[1].textContent.trim().toLowerCase()
		const chartRow = document.createElement('tr')
		chartRow.className = 'chart-row'
		const td = document.createElement('td')
		td.colSpan = 6
		td.innerHTML = '<canvas></canvas>'
		chartRow.appendChild(td)
		tr.parentNode.insertBefore(chartRow, tr.nextSibling)
		expandedRow = chartRow

		const canvas = td.querySelector('canvas')
		const ctx = canvas.getContext('2d')

		if (chartCache[symbol]) {
			drawInlineChart(ctx, chartCache[symbol])
			return
		}
		try {
			const res = await fetch(`/chart/${symbol}?days=7`)
			if (res.ok) {
				const data = await res.json()
				if (!data.length) throw new Error()
				chartCache[symbol] = data
				drawInlineChart(ctx, data)
			} else if (res.status === 429) {
				td.textContent = 'Лимит API, попробуйте позже'
			} else {
				td.textContent = 'Не удалось загрузить график'
			}
		} catch {
			td.textContent = 'Ошибка сети'
		}
	})

	window.setExpandedChartRow = function (row) {
		expandedRow = row
	}
}

function drawInlineChart(ctx, prices) {
	const labels = (() => {
		const out = []
		let prevDay = -1
		prices.forEach(p => {
			const d = new Date(p[0])
			const day = d.getDate()
			if (day !== prevDay) {
				out.push(
					d.toLocaleDateString('ru-RU', {
						month: 'short',
						day: 'numeric',
					})
				)
				prevDay = day
			} else {
				out.push(
					d.toLocaleTimeString('ru-RU', {
						hour: '2-digit',
						minute: undefined,
						hour12: false,
					})
				)
			}
		})
		return out
	})()
	const dataValues = prices.map(p => p[1])
	ctx.canvas.style.height = '350px'
	new Chart(ctx, {
		type: 'line',
		data: {
			labels,
			datasets: [
				{
					data: dataValues,
					borderColor:
						getComputedStyle(document.body)
							.getPropertyValue('--primary')
							.trim() || '#3b82f6',
					borderWidth: 2,
					pointRadius: 0,
					fill: {
						target: 'origin',
						above: 'rgba(59,130,246,0.15)',
					},
				},
			],
		},
		options: {
			plugins: {
				legend: { display: false },
				tooltip: {
					intersect: false,
					mode: 'index',
					callbacks: {
						title: function (context) {
							const idx = context[0].dataIndex
							const d = new Date(prices[idx][0])
							d.setMinutes(0, 0, 0)
							return d.toLocaleString('ru-RU', {
								year: 'numeric',
								month: 'short',
								day: 'numeric',
								hour: '2-digit',
								minute: '2-digit',
								hour12: false,
							})
						},
					},
				},
				crosshair: {
					line: { color: 'rgba(180,180,180,0.6)', width: 1 },
					sync: { enabled: false },
					zoom: false,
				},
			},
			scales: {
				x: {
					display: true,
					grid: {
						color: getComputedStyle(document.body)
							.getPropertyValue('--grid-color')
							.trim(),
					},
					ticks: {
						color: getComputedStyle(document.body)
							.getPropertyValue('--text-color')
							.trim(),
					},
				},
				y: {
					position: 'right',
					display: true,
					grid: {
						color: getComputedStyle(document.body)
							.getPropertyValue('--grid-color')
							.trim(),
					},
					ticks: {
						color: getComputedStyle(document.body)
							.getPropertyValue('--text-color')
							.trim(),
					},
				},
			},
			responsive: true,
			maintainAspectRatio: false,
		},
	})
}
