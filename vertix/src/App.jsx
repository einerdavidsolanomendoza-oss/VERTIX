import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import Auth from './componets/Auth'

function App() {
  // ==========================================
  // NAVEGACIÓN
  // ==========================================


  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const obtenerSesion = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error al obtener sesión:', error.message)
      }

      setSession(data?.session ?? null)
      setAuthLoading(false)
    }

    obtenerSesion()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session?.user) {
      setNombrePerfil(session.user.user_metadata?.nombre || '')
      setMoneda(session.user.user_metadata?.moneda || 'COP')
    }
  }, [session])



  const guardarPerfil = async () => {
    if (!nombrePerfil.trim()) {
      alert('El nombre no puede estar vacío')
      return
    }

    setGuardandoPerfil(true)

    const { error } = await supabase.auth.updateUser({
      data: {
        nombre: nombrePerfil.trim()
      }
    })

    if (error) {
      alert('No se pudo actualizar el perfil')
      console.error(error)
    } else {
      alert('Perfil actualizado correctamente')
    }

    setGuardandoPerfil(false)
  }




  const guardarMoneda = async () => {
    setGuardandoMoneda(true)

    const { data, error } = await supabase.auth.updateUser({
      data: {
        moneda: moneda
      }
    })

    if (error) {
      alert('No se pudo guardar la moneda')
      console.error(error)
    } else {
      setMoneda(data.user.user_metadata?.moneda || 'COP')
      alert('Moneda actualizada correctamente')
    }

    setGuardandoMoneda(false)
  }

  

  const [activePage, setActivePage] = useState('Dashboard')

  const [nombrePerfil, setNombrePerfil] = useState('')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  const [moneda, setMoneda] = useState('COP')
  const [guardandoMoneda, setGuardandoMoneda] = useState(false)

  useEffect(() => {
    if (session?.user) {
      setNombrePerfil(session.user.user_metadata?.nombre || '')
    }
  }, [session])

  const menuItems = [
    'Dashboard',
    'Mis negocios',
    'Finanzas',
    'Objetivos',
    'Informes'
  ]

  // ==========================================
  // NEGOCIOS
  // ==========================================

  const [businesses, setBusinesses] = useState([])
  const [businessName, setBusinessName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Tecnología')
  const [showForm, setShowForm] = useState(false)

  // ==========================================
  // CARGAR NEGOCIOS DESDE SUPABASE
  // ==========================================

  useEffect(() => {
    const cargarNegocios = async () => {
      if (!session) return

      const { data, error } = await supabase
        .from('negocios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al cargar negocios:', error.message)
        return
      }

      const negociosFormateados = data.map(negocio => ({
        id: negocio.id,
        name: negocio.nombre,
        description: negocio.descripcion,
        category: negocio.categoria
      }))

      setBusinesses(negociosFormateados)
    }

    cargarNegocios()
  }, [session])



  // ==========================================
  // CARGAR MOVIMIENTOS DESDE SUPABASE
  // ==========================================

  useEffect(() => {
    const cargarMovimientos = async () => {
      if (!session) return

      const { data, error } = await supabase
        .from('movimientos')
        .select('*')
        .order('fecha', { ascending: false })

      if (error) {
        console.error('Error al cargar movimientos:', error.message)
        return
      }

      const movimientosFormateados = data.map(movimiento => ({
        id: movimiento.id,
        businessId: movimiento.negocio_id,
        name: movimiento.nombre,
        type: movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
        amount: Number(movimiento.monto),
        date: movimiento.fecha
      }))

      setTransactions(movimientosFormateados)
    }

    cargarMovimientos()
  }, [session])


  // ==========================================
  // CARGAR OBJETIVOS DESDE SUPABASE
  // ==========================================

  useEffect(() => {
    const cargarObjetivos = async () => {
      if (!session) return

      const { data, error } = await supabase
        .from('objetivos')
        .select(`
          *,
          actividades (*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error al cargar objetivos:', error.message)
        return
      }

      const objetivosFormateados = data.map(objetivo => ({
        id: objetivo.id,
        businessId: objetivo.negocio_id,
        name: objetivo.nombre,
        description: objetivo.descripcion,
        deadline: objetivo.fecha_limite,
        tasks: (objetivo.actividades || []).map(actividad => ({
          id: actividad.id,
          name: actividad.nombre,
          completed: actividad.completada
        }))
      }))

      setObjectives(objetivosFormateados)
    }

    cargarObjetivos()
  }, [session])



  const addBusiness = async (e) => {
    e.preventDefault()

    if (!businessName.trim() || !session) return

    const { data, error } = await supabase
      .from('negocios')
      .insert([
        {
          usuario_id: session.user.id,
          nombre: businessName.trim(),
          descripcion: description.trim(),
          categoria: category
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error al guardar negocio:', error.message)
      alert('No se pudo guardar el negocio: ' + error.message)
      return
    }

    const newBusiness = {
      id: data.id,
      name: data.nombre,
      description: data.descripcion,
      category: data.categoria
    }

    setBusinesses(current => [...current, newBusiness])

    setBusinessName('')
    setDescription('')
    setCategory('Tecnología')
    setShowForm(false)

    alert('¡Negocio registrado correctamente!')
  }


  const deleteBusiness = async (id) => {
    const confirmar = window.confirm(
      '¿Estás seguro de que deseas eliminar este negocio? También se eliminarán sus movimientos, objetivos y actividades.'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('negocios')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error al eliminar negocio:', error.message)
      alert('No se pudo eliminar el negocio: ' + error.message)
      return
    }

    setBusinesses(current =>
      current.filter(business => business.id !== id)
    )

    setTransactions(current =>
      current.filter(transaction => transaction.businessId !== id)
    )

    setObjectives(current =>
      current.filter(objective => objective.businessId !== id)
    )

    if (selectedBusiness === String(id)) {
      setSelectedBusiness('')
    }

    if (selectedObjectiveBusiness === String(id)) {
      setSelectedObjectiveBusiness('')
    }

    if (selectedReportBusiness === String(id)) {
      setSelectedReportBusiness('')
    }

    alert('Negocio eliminado correctamente.')
  }


  // ==========================================
  // FINANZAS
  // ==========================================

  const [transactions, setTransactions] = useState([])


  // ==========================================
  // ESTADÍSTICAS DEL DASHBOARD
  // ==========================================

  const [selectedBusiness, setSelectedBusiness] = useState('')

  const addTransaction = async (e) => {
    e.preventDefault()

    if (!selectedBusiness || Number(transactionAmount) <= 0) {
      return
    }

    const { data, error } = await supabase
      .from('movimientos')
      .insert([
        {
          negocio_id: selectedBusiness,
          nombre: transactionName.trim(),
          tipo: transactionType.toLowerCase(),
          monto: Number(transactionAmount),
          fecha: transactionDate
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error al guardar movimiento:', error.message)
      alert('No se pudo guardar el movimiento: ' + error.message)
      return
    }

    const newTransaction = {
      id: data.id,
      businessId: data.negocio_id,
      name: data.nombre,
      type: data.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
      amount: Number(data.monto),
      date: data.fecha
    }

    setTransactions(current => [...current, newTransaction])

    setTransactionName('')
    setTransactionAmount('')
    setTransactionDate('')
    setShowTransactionForm(false)

    alert('¡Movimiento registrado correctamente!')
  }



  const deleteTransaction = async (id) => {
    const confirmar = window.confirm(
      '¿Estás seguro de que deseas eliminar este movimiento?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('movimientos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error al eliminar movimiento:', error.message)
      alert('No se pudo eliminar el movimiento: ' + error.message)
      return
    }

    setTransactions(current =>
      current.filter(transaction => transaction.id !== id)
    )

    alert('Movimiento eliminado correctamente.')
  }


  // ==========================================
  // OBJETIVOS Y ACTIVIDADES
  // ==========================================

  const [objectives, setObjectives] = useState([])
  const [selectedObjectiveBusiness, setSelectedObjectiveBusiness] = useState('')
  const [showObjectiveForm, setShowObjectiveForm] = useState(false)

  const [objectiveName, setObjectiveName] = useState('')
  const [objectiveDescription, setObjectiveDescription] = useState('')
  const [objectiveDeadline, setObjectiveDeadline] = useState('')
  const [taskNames, setTaskNames] = useState({})


  const dashboardTransactions = selectedBusiness
    ? transactions.filter(
      transaction =>
        String(transaction.businessId) === String(selectedBusiness)
    )
    : transactions


  const dashboardObjectives = selectedBusiness
    ? objectives.filter(
      objective =>
        String(objective.businessId) === String(selectedBusiness)
    )
    : objectives



  const totalIngresos = dashboardTransactions
    .filter(transaction => transaction.type === 'Ingreso')
    .reduce((total, transaction) => total + Number(transaction.amount), 0)

  const totalGastos = dashboardTransactions
    .filter(transaction => transaction.type === 'Gasto')
    .reduce((total, transaction) => total + Number(transaction.amount), 0)

  const balanceActual = totalIngresos - totalGastos

  const totalObjetivos = objectives.length

  const objetivosCompletados = objectives.filter(objective =>
    objective.tasks.length > 0 &&
    objective.tasks.every(task => task.completed)
  ).length


  const [showTransactionForm, setShowTransactionForm] = useState(false)

  const [transactionType, setTransactionType] = useState('Ingreso')
  const [transactionName, setTransactionName] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')

  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const currentBusiness = businesses.find(
    business => String(business.id) === selectedBusiness
  )

  const businessTransactions = transactions.filter(
    transaction => String(transaction.businessId) === selectedBusiness
  )

  const totalIncome = businessTransactions
    .filter(transaction => transaction.type === 'Ingreso')
    .reduce((total, transaction) => total + transaction.amount, 0)

  const totalExpenses = businessTransactions
    .filter(transaction => transaction.type === 'Gasto')
    .reduce((total, transaction) => total + transaction.amount, 0)

  const balance = totalIncome - totalExpenses






  // ==========================================
  // DATOS DEL GRÁFICO: ÚLTIMOS 6 MESES
  // ==========================================

  const monthlyChartData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - index))

    const year = date.getFullYear()
    const month = date.getMonth()

    const monthlyTransactions = dashboardTransactions.filter(transaction => {
      const transactionDate = new Date(`${transaction.date}T00:00:00`)

      return (
        transactionDate.getFullYear() === year &&
        transactionDate.getMonth() === month
      )
    })

    const income = monthlyTransactions
      .filter(transaction => transaction.type === 'Ingreso')
      .reduce((total, transaction) => total + Number(transaction.amount), 0)

    const expenses = monthlyTransactions
      .filter(transaction => transaction.type === 'Gasto')
      .reduce((total, transaction) => total + Number(transaction.amount), 0)

    return {
      label: new Intl.DateTimeFormat('es-CO', {
        month: 'short'
      }).format(date),
      income,
      expenses
    }
  })

  const maxMonthlyValue = Math.max(
    1,
    ...monthlyChartData.flatMap(month => [
      month.income,
      month.expenses
    ])
  ) * 1.2

  console.log('Máximo mensual:', maxMonthlyValue)
  console.table(monthlyChartData)





  const addObjective = async (e) => {
    e.preventDefault()

    if (!selectedObjectiveBusiness || !objectiveName.trim()) {
      return
    }

    const { data, error } = await supabase
      .from('objetivos')
      .insert([
        {
          negocio_id: selectedObjectiveBusiness,
          nombre: objectiveName.trim(),
          descripcion: objectiveDescription.trim(),
          fecha_limite: objectiveDeadline || null
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error al guardar objetivo:', error.message)
      alert('No se pudo guardar el objetivo: ' + error.message)
      return
    }

    const newObjective = {
      id: data.id,
      businessId: data.negocio_id,
      name: data.nombre,
      description: data.descripcion,
      deadline: data.fecha_limite,
      tasks: []
    }

    setObjectives(current => [...current, newObjective])

    setObjectiveName('')
    setObjectiveDescription('')
    setObjectiveDeadline('')
    setShowObjectiveForm(false)

    alert('¡Objetivo registrado correctamente!')
  }




  const addTask = async (e, objectiveId) => {
    e.preventDefault()

    const nombreActividad = (taskNames[objectiveId] || '').trim()

    if (!nombreActividad) return

    const { data, error } = await supabase
      .from('actividades')
      .insert([{
        objetivo_id: objectiveId,
        nombre: nombreActividad,
        completada: false
      }])
      .select()
      .single()

    if (error) {
      console.error('Error al guardar actividad:', error.message)
      alert('No se pudo guardar la actividad: ' + error.message)
      return
    }

    const newTask = {
      id: data.id,
      name: data.nombre,
      completed: data.completada
    }

    setObjectives(current =>
      current.map(objective =>
        objective.id === objectiveId
          ? { ...objective, tasks: [...objective.tasks, newTask] }
          : objective
      )
    )

    setTaskNames(current => ({
      ...current,
      [objectiveId]: ''
    }))
  }




  const toggleTask = async (objectiveId, taskId) => {
    const objective = objectives.find(
      objective => objective.id === objectiveId
    )

    if (!objective) return

    const task = objective.tasks.find(
      task => task.id === taskId
    )

    if (!task) return

    const nuevoEstado = !task.completed

    const { error } = await supabase
      .from('actividades')
      .update({ completada: nuevoEstado })
      .eq('id', taskId)

    if (error) {
      console.error('Error al actualizar actividad:', error.message)
      alert('No se pudo actualizar la actividad: ' + error.message)
      return
    }

    setObjectives(current =>
      current.map(objective =>
        objective.id === objectiveId
          ? {
            ...objective,
            tasks: objective.tasks.map(task =>
              task.id === taskId
                ? { ...task, completed: nuevoEstado }
                : task
            )
          }
          : objective
      )
    )
  }



  const deleteTask = async (objectiveId, taskId) => {
    const confirmar = window.confirm(
      '¿Estás seguro de que deseas eliminar esta actividad?'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('actividades')
      .delete()
      .eq('id', taskId)

    if (error) {
      console.error('Error al eliminar actividad:', error.message)
      alert('No se pudo eliminar la actividad: ' + error.message)
      return
    }

    setObjectives(current =>
      current.map(objective =>
        objective.id === objectiveId
          ? {
            ...objective,
            tasks: objective.tasks.filter(
              task => task.id !== taskId
            )
          }
          : objective
      )
    )

    alert('¡Actividad eliminada correctamente!')
  }


  const deleteObjective = async (id) => {
    const confirmar = window.confirm(
      '¿Estás seguro de que deseas eliminar este objetivo? También se eliminarán sus actividades.'
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('objetivos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error al eliminar objetivo:', error.message)
      alert('No se pudo eliminar el objetivo: ' + error.message)
      return
    }

    setObjectives(current =>
      current.filter(objective => objective.id !== id)
    )

    alert('¡Objetivo eliminado correctamente!')
  }

  // ==========================================
  // INFORMES Y ESTADÍSTICAS
  // ==========================================

  const [selectedReportBusiness, setSelectedReportBusiness] = useState('')

  const [selectedReportPeriod, setSelectedReportPeriod] = useState('all')

  const today = new Date()

  const reportTransactions = transactions.filter(transaction => {
    // Filtro por emprendimiento
    const matchesBusiness = selectedReportBusiness === ''
      ? true
      : String(transaction.businessId) === selectedReportBusiness

    // Fecha del movimiento
    const transactionDate = new Date(`${transaction.date}T00:00:00`)

    // Fechas de referencia
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1)
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1)
    const endOfLastMonth = new Date(currentYear, currentMonth, 0)
    const startOfThreeMonths = new Date(currentYear, currentMonth - 2, 1)
    const startOfYear = new Date(currentYear, 0, 1)

    let matchesPeriod = true

    if (selectedReportPeriod === 'month') {
      matchesPeriod = transactionDate >= startOfCurrentMonth
    }

    if (selectedReportPeriod === 'lastMonth') {
      matchesPeriod =
        transactionDate >= startOfLastMonth &&
        transactionDate <= endOfLastMonth
    }

    if (selectedReportPeriod === 'threeMonths') {
      matchesPeriod = transactionDate >= startOfThreeMonths
    }

    if (selectedReportPeriod === 'year') {
      matchesPeriod = transactionDate >= startOfYear
    }

    return matchesBusiness && matchesPeriod
  })

  const reportIncome = reportTransactions
    .filter(transaction => transaction.type === 'Ingreso')
    .reduce((total, transaction) => total + transaction.amount, 0)

  const reportExpenses = reportTransactions
    .filter(transaction => transaction.type === 'Gasto')
    .reduce((total, transaction) => total + transaction.amount, 0)

  const reportBalance = reportIncome - reportExpenses

  const reportProfitability = reportIncome > 0
    ? (reportBalance / reportIncome) * 100
    : 0

  const businessReports = businesses.map(business => {
    const movements = transactions.filter(
      transaction => transaction.businessId === business.id
    )

    const income = movements
      .filter(transaction => transaction.type === 'Ingreso')
      .reduce((total, transaction) => total + transaction.amount, 0)

    const expenses = movements
      .filter(transaction => transaction.type === 'Gasto')
      .reduce((total, transaction) => total + transaction.amount, 0)

    return {
      ...business,
      income,
      expenses,
      balance: income - expenses,
      movements: movements.length
    }
  })

  const recentTransactions = [...reportTransactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)

  const monthlyReportData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - index))

    const year = date.getFullYear()
    const month = date.getMonth()

    const monthlyTransactions = reportTransactions.filter(transaction => {
      const transactionDate = new Date(`${transaction.date}T00:00:00`)

      return (
        transactionDate.getFullYear() === year &&
        transactionDate.getMonth() === month
      )
    })

    const income = monthlyTransactions
      .filter(transaction => transaction.type === 'Ingreso')
      .reduce((total, transaction) => total + Number(transaction.amount), 0)

    const expenses = monthlyTransactions
      .filter(transaction => transaction.type === 'Gasto')
      .reduce((total, transaction) => total + Number(transaction.amount), 0)

    return {
      label: new Intl.DateTimeFormat('es-CO', {
        month: 'short'
      }).format(date),
      income,
      expenses
    }
  })

  const monthlyReportMaximum = Math.max(


    1,
    ...monthlyReportData.flatMap(month => [
      month.income,
      month.expenses
    ])
  )

  const incomeBarHeight = (reportIncome / Math.max(reportIncome, reportExpenses, 1)) * 100

  const expensesBarHeight = (reportExpenses / Math.max(reportIncome, reportExpenses, 1)) * 100

  // ==========================================
  // UTILIDADES
  // ==========================================

  const formatMoney = (value) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(value)

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  // ==========================================
  // CONTROL DE ACCESO
  // ==========================================

  if (authLoading) {
    return (
      <div className="auth-loading">
        Cargando VÉRTIX...
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="app">



      {/* MENÚ LATERAL */}

      <aside className="sidebar">

        <h2 className="logo">VÉRTIX<span>.</span></h2>

        <p className="menu-title">MENÚ PRINCIPAL</p>

        <nav>
          {menuItems.map(item => (
            <button
              key={item}
              className={
                activePage === item
                  ? 'menu-button active'
                  : 'menu-button'
              }
              onClick={() => setActivePage(item)}
            >
              {item === 'Dashboard' && '◈'}
              {item === 'Mis negocios' && '▣'}
              {item === 'Finanzas' && '◉'}
              {item === 'Objetivos' && '◎'}
              {item === 'Informes' && '▤'}
              {' '}{item}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">

          <button
            className="menu-button"
            onClick={() => setActivePage('Configuración')}
          >
            ⚙ Configuración
          </button>

          <button
            className="menu-button"
            onClick={async () => {
              const { error } = await supabase.auth.signOut()

              if (error) {
                console.error('Error al cerrar sesión:', error.message)
              }
            }}
          >
            ↪ Cerrar sesión
          </button>

        </div>

      </aside>

      {/* CONTENIDO PRINCIPAL */}

      <main className="main-content">

        {/* ENCABEZADO */}


        <header className="topbar">

          <div className="topbar-title">
            <p className="greeting">
              PLATAFORMA DE GESTIÓN EMPRESARIAL
            </p>

            <h1>{activePage}</h1>
          </div>

          <div className="profile">
            <div className="avatar">
              {(session.user.user_metadata?.nombre || session.user.email || 'U')
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="profile-info">
              <strong>
                {session.user.user_metadata?.nombre || 'Usuario'}
              </strong>
              <p>{session.user.email}</p>
            </div>
          </div>

        </header>


        

        {/* =====================================
            DASHBOARD
        ===================================== */}

        {activePage === 'Dashboard' && (
          <>
            <div className="dashboard-filter">
              <label>Consultar emprendimiento:</label>

              <select
                value={selectedBusiness}
                onChange={e => setSelectedBusiness(e.target.value)}
              >
                <option value="">Todos mis emprendimientos</option>

                {businesses.map(business => (
                  <option key={business.id} value={String(business.id)}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>

            <section className="welcome">

              <div>
                <span className="welcome-tag">
                  TU NEGOCIO, UNA NUEVA VISIÓN
                </span>

                <h2>
                  Bienvenido a <span>VÉRTIX</span>
                </h2>

                <p>
                  De una idea a un negocio con dirección.
                </p>
              </div>

              <div className="welcome-symbol">✦</div>

            </section>


            <section className="stats">

              <article className="stat-card">
                <p>Ingresos totales</p>
                <h2>
                  {totalIngresos.toLocaleString('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0
                  })}
                </h2>
                <span>Ingresos registrados</span>
              </article>

              <article className="stat-card">
                <p>Gastos totales</p>
                <h2>
                  {totalGastos.toLocaleString('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0
                  })}
                </h2>
                <span>Gastos registrados</span>
              </article>

              <article className="stat-card">
                <p>Balance actual</p>
                <h2>
                  {balanceActual.toLocaleString('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0
                  })}
                </h2>
                <span>Ingresos menos gastos</span>
              </article>

              <article className="stat-card">
                <p>Mis negocios</p>
                <h2>
                  {businesses.length.toString().padStart(2, '0')}
                </h2>
                <span>Negocios registrados</span>
              </article>

            </section>

            <section className="content-grid">

              <article className="panel">

                <div className="panel-header">

                  <div>
                    <p className="section-label">ACTIVIDAD</p>
                    <h3>Rendimiento del negocio</h3>
                  </div>

                  <span className="period">
                    Últimos 6 meses
                  </span>

                </div>


                <div className="chart-placeholder">

                  <div className="chart-legend">
                    <span className="legend-income">Ingresos</span>
                    <span className="legend-expense">Gastos</span>
                  </div>

                  <div className="chart-line">
                    <span>{maxMonthlyValue.toLocaleString('es-CO')}</span>
                    <span>{(maxMonthlyValue * 0.66).toLocaleString('es-CO')}</span>
                    <span>{(maxMonthlyValue * 0.33).toLocaleString('es-CO')}</span>
                    <span>0</span>
                  </div>

                  <div className="bars">
                    {monthlyChartData.map((month, index) => (
                      <div className="month-group" key={`${month.label}-${index}`}>

                        <div className="month-columns">


                          <div
                            className="income-bar"
                            title={`Ingresos: ${month.income.toLocaleString('es-CO')}`}
                            style={{
                              height: `${(month.income / maxMonthlyValue) * 100}%`
                            }}
                          />

                          <div
                            className="expense-bar"
                            title={`Gastos: ${month.expenses.toLocaleString('es-CO')}`}
                            style={{
                              height: `${Math.min((month.expenses / maxMonthlyValue) * 100, 100)}%`
                            }}
                          />

                        </div>

                        <span>{month.label}</span>

                      </div>
                    ))}
                  </div>

                </div>


              </article>


              <article className="panel objectives">

                <p className="section-label">SEGUIMIENTO</p>
                <h3>Objetivos principales</h3>

                {dashboardObjectives.length === 0 ? (
                  <p>No tienes objetivos registrados todavía.</p>
                ) : (
                  dashboardObjectives.slice(0, 4).map(objective => {
                    const totalTasks = objective.tasks.length

                    const completedTasks = objective.tasks.filter(
                      task => task.completed
                    ).length

                    const progress = totalTasks > 0
                      ? Math.round((completedTasks / totalTasks) * 100)
                      : 0

                    const business = businesses.find(
                      business =>
                        String(business.id) === String(objective.businessId)
                    )

                    return (
                      <div className="objective" key={objective.id}>

                        <div>
                          <strong>{objective.name}</strong>
                          <span>{progress}%</span>
                        </div>

                        <p>
                          {business ? business.name : 'Emprendimiento'}
                        </p>

                        <div className="progress">
                          <div style={{ width: `${progress}%` }}></div>
                        </div>

                        <small>
                          {completedTasks} de {totalTasks} actividades completadas
                        </small>

                      </div>
                    )
                  })
                )}

              </article>


            </section>

          </>
        )}

        {/* =====================================
            MIS NEGOCIOS
        ===================================== */}

        {activePage === 'Mis negocios' && (
          <section className="business-module">

            <div className="business-heading">

              <div>
                <p className="section-label">GESTIÓN EMPRESARIAL</p>
                <h2>Mis negocios</h2>
                <p>
                  Administra y organiza todos tus emprendimientos.
                </p>
              </div>

              <button
                className="add-business-button"
                onClick={() => setShowForm(!showForm)}
              >
                + Nuevo negocio
              </button>

            </div>

            {showForm && (
              <form className="business-form" onSubmit={addBusiness}>

                <h3>Registrar emprendimiento</h3>

                <label>Nombre del negocio</label>

                <input
                  type="text"
                  placeholder="Ej: Mi tienda online"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  required
                />

                <label>Descripción</label>

                <textarea
                  placeholder="Describe brevemente tu emprendimiento..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />

                <label>Categoría</label>

                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option>Tecnología</option>
                  <option>Alimentos</option>
                  <option>Comercio</option>
                  <option>Servicios</option>
                  <option>Educación</option>
                  <option>Moda</option>
                  <option>Otro</option>
                </select>

                <div className="form-actions">

                  <button
                    type="submit"
                    className="add-business-button"
                  >
                    Guardar negocio
                  </button>

                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </button>

                </div>

              </form>
            )}

            <div className="business-summary">

              <div className="stat-card">
                <p>Total de negocios</p>
                <h2>{businesses.length}</h2>
                <span>Emprendimientos registrados</span>
              </div>

            </div>

            <div className="business-list">

              {businesses.length === 0 ? (

                <div className="empty-business panel">

                  <div className="empty-icon">✦</div>

                  <h3>
                    Aún no tienes negocios registrados
                  </h3>

                  <p>
                    Comienza agregando tu primer emprendimiento a VÉRTIX.
                  </p>

                  <button
                    className="add-business-button"
                    onClick={() => setShowForm(true)}
                  >
                    Crear mi primer negocio
                  </button>

                </div>

              ) : (

                businesses.map(business => (

                  <article
                    className="business-card"
                    key={business.id}
                  >

                    <div className="business-card-icon">✦</div>

                    <span className="business-category">
                      {business.category}
                    </span>

                    <h3>{business.name}</h3>

                    <p>{business.description}</p>

                    <button
                      className="delete-business-button"
                      onClick={() => deleteBusiness(business.id)}
                    >
                      Eliminar negocio
                    </button>

                  </article>

                ))

              )}

            </div>

          </section>
        )}

        {/* =====================================
            FINANZAS
        ===================================== */}

        {activePage === 'Finanzas' && (
          <section className="finance-module">

            <div className="business-heading">

              <div>
                <p className="section-label">CONTROL FINANCIERO</p>
                <h2>Finanzas</h2>
                <p>
                  Administra los movimientos de cada emprendimiento.
                </p>
              </div>

            </div>

            {businesses.length === 0 ? (

              <div className="panel empty-business">

                <div className="empty-icon">◉</div>

                <h3>Primero registra un emprendimiento</h3>

                <p>
                  Las finanzas se administran de forma independiente para cada negocio.
                </p>

                <button
                  className="add-business-button"
                  onClick={() => setActivePage('Mis negocios')}
                >
                  Ir a Mis negocios
                </button>

              </div>

            ) : (

              <>

                <div className="finance-selector panel">

                  <label>Selecciona un emprendimiento</label>

                  <select
                    value={selectedBusiness}
                    onChange={e => {
                      setSelectedBusiness(e.target.value)
                      setShowTransactionForm(false)
                    }}
                  >

                    <option value="">
                      Seleccionar negocio...
                    </option>

                    {businesses.map(business => (
                      <option
                        key={business.id}
                        value={business.id}
                      >
                        {business.name}
                      </option>
                    ))}

                  </select>

                </div>

                {currentBusiness && (

                  <>

                    <div className="finance-business-title">

                      <span className="business-category">
                        {currentBusiness.category}
                      </span>

                      <h3>{currentBusiness.name}</h3>

                    </div>

                    <div className="finance-stats">

                      <article className="stat-card">
                        <p>Ingresos</p>
                        <h2 className="income-value">
                          {formatMoney(totalIncome)}
                        </h2>
                        <span>Dinero recibido</span>
                      </article>

                      <article className="stat-card">
                        <p>Gastos</p>
                        <h2 className="expense-value">
                          {formatMoney(totalExpenses)}
                        </h2>
                        <span>Dinero utilizado</span>
                      </article>

                      <article className="stat-card">
                        <p>Balance</p>
                        <h2>{formatMoney(balance)}</h2>
                        <span>Ingresos menos gastos</span>
                      </article>

                    </div>

                    <div className="finance-actions">

                      <button
                        className="add-business-button"
                        onClick={() =>
                          setShowTransactionForm(!showTransactionForm)
                        }
                      >
                        + Registrar movimiento
                      </button>

                    </div>

                    {showTransactionForm && (

                      <form
                        className="business-form transaction-form"
                        onSubmit={addTransaction}
                      >

                        <h3>Nuevo movimiento financiero</h3>

                        <label>Tipo de movimiento</label>

                        <select
                          value={transactionType}
                          onChange={e => setTransactionType(e.target.value)}
                        >
                          <option>Ingreso</option>
                          <option>Gasto</option>
                        </select>

                        <label>Concepto</label>

                        <input
                          type="text"
                          placeholder="Ej: Venta de productos"
                          value={transactionName}
                          onChange={e => setTransactionName(e.target.value)}
                          required
                        />

                        <label>Valor en pesos colombianos</label>

                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Ej: 150000"
                          value={transactionAmount}
                          onChange={e => setTransactionAmount(e.target.value)}
                          required
                        />

                        <label>Fecha del movimiento</label>

                        <input
                          type="date"
                          value={transactionDate}
                          onChange={e => setTransactionDate(e.target.value)}
                          required
                        />

                        <div className="form-actions">

                          <button
                            type="submit"
                            className="add-business-button"
                          >
                            Guardar movimiento
                          </button>

                          <button
                            type="button"
                            className="cancel-button"
                            onClick={() => setShowTransactionForm(false)}
                          >
                            Cancelar
                          </button>

                        </div>

                      </form>

                    )}

                    <div className="panel transaction-panel">

                      <div className="panel-header">

                        <div>
                          <p className="section-label">
                            REGISTRO FINANCIERO
                          </p>
                          <h3>Historial de movimientos</h3>
                        </div>

                        <span className="period">
                          {businessTransactions.length} movimientos
                        </span>

                      </div>

                      {businessTransactions.length === 0 ? (

                        <div className="empty-transactions">
                          <p>
                            Aún no hay movimientos registrados para este negocio.
                          </p>
                        </div>

                      ) : (

                        <div className="transaction-list">

                          {businessTransactions.map(transaction => (

                            <div
                              className="transaction-row"
                              key={transaction.id}
                            >

                              <div className="transaction-icon">
                                {transaction.type === 'Ingreso' ? '↗' : '↘'}
                              </div>

                              <div className="transaction-info">

                                <strong>{transaction.name}</strong>

                                <span>
                                  {transaction.type} · {transaction.date}
                                </span>

                              </div>

                              <strong className={
                                transaction.type === 'Ingreso'
                                  ? 'income-value'
                                  : 'expense-value'
                              }>
                                {transaction.type === 'Ingreso' ? '+' : '-'}
                                {formatMoney(transaction.amount)}
                              </strong>

                              <button
                                className="delete-transaction-button"
                                onClick={() => deleteTransaction(transaction.id)}
                              >
                                Eliminar
                              </button>

                            </div>

                          ))}

                        </div>

                      )}

                    </div>

                  </>

                )}

              </>

            )}

          </section>
        )}

        {/* =====================================
            OBJETIVOS
        ===================================== */}

        {activePage === 'Objetivos' && (
          <section className="panel objectives-module">

            <div className="business-heading">

              <div>
                <p className="section-label">PLANIFICACIÓN</p>
                <h2>Objetivos y actividades</h2>

                <p>
                  Define tus metas y organiza las actividades necesarias
                  para hacer crecer tu emprendimiento.
                </p>

              </div>

            </div>

            {businesses.length === 0 ? (

              <div className="objectives-empty">

                <h3>Primero registra un emprendimiento</h3>

                <p>
                  Para crear objetivos necesitas tener al menos un
                  emprendimiento registrado en VÉRTIX.
                </p>

                <button
                  className="add-business-button"
                  onClick={() => setActivePage('Mis negocios')}
                >
                  Ir a mis negocios
                </button>

              </div>

            ) : (

              <>

                <div className="objective-business-selector">

                  <label>Selecciona tu emprendimiento</label>

                  <select
                    value={selectedObjectiveBusiness}
                    onChange={e =>
                      setSelectedObjectiveBusiness(e.target.value)
                    }
                  >

                    <option value="">
                      Seleccionar emprendimiento
                    </option>

                    {businesses.map(business => (
                      <option
                        key={business.id}
                        value={business.id}
                      >
                        {business.name}
                      </option>
                    ))}

                  </select>

                </div>

                {selectedObjectiveBusiness && (

                  <div className="objectives-content">

                    <div className="objectives-heading">

                      <div>
                        <h3>Mis objetivos</h3>
                        <p>
                          Organiza las metas de este emprendimiento.
                        </p>
                      </div>

                      <button
                        className="add-business-button"
                        onClick={() =>
                          setShowObjectiveForm(!showObjectiveForm)
                        }
                      >
                        {showObjectiveForm
                          ? 'Cancelar'
                          : '+ Nuevo objetivo'}
                      </button>

                    </div>

                    {showObjectiveForm && (

                      <form
                        className="objective-form"
                        onSubmit={addObjective}
                      >

                        <h3>Crear nuevo objetivo</h3>

                        <label>Nombre del objetivo</label>

                        <input
                          type="text"
                          placeholder="Ej. Aumentar las ventas"
                          value={objectiveName}
                          onChange={e => setObjectiveName(e.target.value)}
                          required
                        />

                        <label>Descripción</label>

                        <textarea
                          placeholder="Describe qué quieres conseguir..."
                          value={objectiveDescription}
                          onChange={e =>
                            setObjectiveDescription(e.target.value)
                          }
                        />

                        <label>Fecha límite</label>

                        <input
                          type="date"
                          value={objectiveDeadline}
                          onChange={e =>
                            setObjectiveDeadline(e.target.value)
                          }
                          required
                        />

                        <button
                          type="submit"
                          className="add-business-button"
                        >
                          Guardar objetivo
                        </button>

                      </form>

                    )}


                    {objectives.filter(
                      objective =>
                        String(objective.businessId) === String(selectedObjectiveBusiness)
                    ).length === 0 ? (

                      <div className="objectives-empty">
                        <h3>Aún no tienes objetivos</h3>

                        <p>
                          Crea tu primer objetivo y comienza a organizar
                          las actividades de tu emprendimiento.
                        </p>
                      </div>

                    )
                      : (

                        <div className="objectives-list">


                          {objectives
                            .filter(
                              objective =>
                                String(objective.businessId) === String(selectedObjectiveBusiness)
                            )
                            .map(objective => {


                              const completedTasks =
                                objective.tasks.filter(
                                  task => task.completed
                                ).length

                              const progress =
                                objective.tasks.length === 0
                                  ? 0
                                  : Math.round(
                                    (completedTasks /
                                      objective.tasks.length) * 100
                                  )

                              return (

                                <article
                                  className="objective-card"
                                  key={objective.id}
                                >

                                  <div className="objective-card-header">

                                    <div>

                                      <span className="objective-status">
                                        {progress === 100
                                          ? 'Completado'
                                          : progress > 0
                                            ? 'En progreso'
                                            : 'Pendiente'}
                                      </span>

                                      <h3>{objective.name}</h3>

                                    </div>

                                    <button
                                      className="delete-business-button"
                                      onClick={() =>
                                        deleteObjective(objective.id)
                                      }
                                    >
                                      Eliminar
                                    </button>

                                  </div>

                                  <p>{objective.description}</p>

                                  <div className="objective-meta">

                                    <span>
                                      Fecha límite: {objective.deadline}
                                    </span>

                                    <span>
                                      {completedTasks} de {objective.tasks.length} actividades
                                    </span>

                                  </div>

                                  <div className="objective-progress">

                                    <div className="objective-progress-info">
                                      <span>Progreso</span>
                                      <strong>{progress}%</strong>
                                    </div>

                                    <div className="objective-progress-track">

                                      <div
                                        className="objective-progress-fill"
                                        style={{ width: `${progress}%` }}
                                      />

                                    </div>

                                  </div>

                                  <div className="objective-tasks">

                                    <h4>Actividades</h4>

                                    {objective.tasks.map(task => (

                                      <div
                                        className="task-row"
                                        key={task.id}
                                      >

                                        <label>

                                          <input
                                            type="checkbox"
                                            checked={task.completed}
                                            onChange={() =>
                                              toggleTask(
                                                objective.id,
                                                task.id
                                              )
                                            }
                                          />

                                          <span className={
                                            task.completed
                                              ? 'task-completed'
                                              : ''
                                          }>
                                            {task.name}
                                          </span>

                                        </label>

                                        <button
                                          className="delete-task-button"
                                          onClick={() =>
                                            deleteTask(
                                              objective.id,
                                              task.id
                                            )
                                          }
                                        >
                                          ×
                                        </button>

                                      </div>

                                    ))}


                                    <form
                                      className="task-add-form"
                                      onSubmit={e => addTask(e, objective.id)}
                                    >
                                      <input
                                        type="text"
                                        placeholder="Agregar una actividad..."
                                        value={taskNames[objective.id] || ''}
                                        onChange={e =>
                                          setTaskNames(current => ({
                                            ...current,
                                            [objective.id]: e.target.value
                                          }))
                                        }
                                      />

                                      <button type="submit">
                                        Agregar
                                      </button>
                                    </form>


                                  </div>

                                </article>

                              )

                            })}

                        </div>

                      )}

                  </div>

                )}

              </>

            )}

          </section>
        )}

        {/* =====================================
            INFORMES
        ===================================== */}

        {activePage === 'Informes' && (
          <section className="reports-module">

            <div className="business-heading">

              <div>
                <p className="section-label">ANÁLISIS EMPRESARIAL</p>
                <h2>Informes y estadísticas</h2>

                <p>
                  Consulta el rendimiento financiero de tus emprendimientos
                  y analiza cómo evoluciona tu negocio.
                </p>

              </div>

            </div>

            {/* FILTRO DE NEGOCIOS */}

            <div className="reports-filter panel">

              <div>
                <label>Consultar informes de:</label>
                <p>Selecciona un negocio o visualiza todos.</p>
              </div>

              <div className="period-filter">
                <label>Negocio:</label>
                <select
                  value={selectedReportBusiness}
                  onChange={e =>
                    setSelectedReportBusiness(e.target.value)
                  }
                >
                  <option value="all">Todo el tiempo</option>
                  <option value="month">Este mes</option>
                  <option value="lastMonth">Mes anterior</option>
                  <option value="threeMonths">Últimos 3 meses</option>
                  <option value="year">Este año</option>
                </select>
              </div>

              <select
                value={selectedReportBusiness}
                onChange={e =>
                  setSelectedReportBusiness(e.target.value)
                }
              >

                <option value="">Todos los negocios</option>

                {businesses.map(business => (
                  <option
                    key={business.id}
                    value={business.id}
                  >
                    {business.name}
                  </option>
                ))}

              </select>

            </div>

            {/* RESUMEN FINANCIERO */}

            <div className="reports-stats">

              <article className="stat-card">
                <p>Ingresos totales</p>
                <h2 className="income-value">
                  {formatMoney(reportIncome)}
                </h2>
                <span>Dinero recibido</span>
              </article>

              <article className="stat-card">
                <p>Gastos totales</p>
                <h2 className="expense-value">
                  {formatMoney(reportExpenses)}
                </h2>
                <span>Dinero utilizado</span>
              </article>

              <article className="stat-card">
                <p>Balance neto</p>
                <h2>{formatMoney(reportBalance)}</h2>
                <span>Ingresos menos gastos</span>
              </article>

              <article className="stat-card">
                <p>Rentabilidad</p>
                <h2 className="profitability-value">
                  {reportProfitability.toFixed(1)}%
                </h2>
                <span>Porcentaje de ganancia sobre ingresos</span>
              </article>

              <article className="stat-card">
                <p>Movimientos</p>
                <h2>{reportTransactions.length}</h2>
                <span>Registros financieros</span>
              </article>

            </div>

            {/* GRÁFICA FINANCIERA */}

            <div className="panel reports-chart-panel">

              <div className="panel-header">

                <div>
                  <p className="section-label">ANÁLISIS FINANCIERO</p>
                  <h3>Ingresos vs. gastos</h3>
                </div>

                <span className="period">Resumen general</span>

              </div>

              <div className="reports-chart monthly-reports-chart">

                {monthlyReportData.map((month, index) => {

                  const incomeHeight = Math.min(
                    (month.income / monthlyReportMaximum) * 100,
                    100
                  )

                  const expensesHeight = Math.min(
                    (month.expenses / monthlyReportMaximum) * 100,
                    100
                  )

                  return (
                    <div className="monthly-report-group" key={index}>

                      <div className="monthly-report-bars">

                        <div className="monthly-report-column">
                          <div
                            className="monthly-report-bar income-bar"
                            style={{ height: `${incomeHeight}%` }}
                            title={`Ingresos: ${formatMoney(month.income)}`}
                          />
                        </div>

                        <div className="monthly-report-column">
                          <div
                            className="monthly-report-bar expense-bar"
                            style={{ height: `${expensesHeight}%` }}
                            title={`Gastos: ${formatMoney(month.expenses)}`}
                          />
                        </div>

                      </div>

                      <strong>{month.label}</strong>

                    </div>
                  )
                })}

              </div>

              <div className="reports-legend">
                <span><i className="legend-income" /> Ingresos</span>
                <span><i className="legend-expense" /> Gastos</span>
              </div>

            </div>

            {/* RENDIMIENTO POR NEGOCIO */}

            {!selectedReportBusiness && (

              <div className="panel reports-business-panel">

                <div className="panel-header">

                  <div>
                    <p className="section-label">RENDIMIENTO</p>
                    <h3>Rendimiento por negocio</h3>
                  </div>

                  <span className="period">
                    {businesses.length} negocios
                  </span>

                </div>

                {businessReports.length === 0 ? (

                  <div className="empty-transactions">
                    <p>
                      Registra tu primer negocio para consultar su rendimiento.
                    </p>
                  </div>

                ) : (

                  <div className="reports-business-list">

                    {businessReports.map(business => (

                      <article
                        className="reports-business-row"
                        key={business.id}
                      >

                        <div>
                          <strong>{business.name}</strong>

                          <span>
                            {business.category} · {business.movements} movimientos
                          </span>
                        </div>

                        <div className="reports-business-values">

                          <span className="income-value">
                            +{formatMoney(business.income)}
                          </span>

                          <span className="expense-value">
                            -{formatMoney(business.expenses)}
                          </span>

                          <strong>
                            {formatMoney(business.balance)}
                          </strong>

                        </div>

                      </article>

                    ))}

                  </div>

                )}

              </div>

            )}

            {/* HISTORIAL DE MOVIMIENTOS */}

            <div className="panel reports-history-panel">

              <div className="panel-header">

                <div>
                  <p className="section-label">ACTIVIDAD FINANCIERA</p>
                  <h3>Últimos movimientos</h3>
                </div>

                <span className="period">
                  Últimos 5 registros
                </span>

              </div>

              {recentTransactions.length === 0 ? (

                <div className="empty-transactions">

                  <h3>Sin movimientos registrados</h3>

                  <p>
                    Cuando registres ingresos o gastos en Finanzas,
                    aparecerán aquí automáticamente.
                  </p>

                </div>

              ) : (

                <div className="transaction-list">

                  {recentTransactions.map(transaction => {

                    const business = businesses.find(
                      item => item.id === transaction.businessId
                    )

                    return (

                      <div
                        className="transaction-row"
                        key={transaction.id}
                      >

                        <div className="transaction-icon">
                          {transaction.type === 'Ingreso' ? '↗' : '↘'}
                        </div>

                        <div className="transaction-info">

                          <strong>{transaction.name}</strong>

                          <span>
                            {business?.name || 'Negocio'} · {transaction.date}
                          </span>

                        </div>

                        <strong className={
                          transaction.type === 'Ingreso'
                            ? 'income-value'
                            : 'expense-value'
                        }>
                          {transaction.type === 'Ingreso' ? '+' : '-'}
                          {formatMoney(transaction.amount)}
                        </strong>

                      </div>

                    )

                  })}

                </div>

              )}

            </div>

          </section>
        )}

        {/* =====================================
            OTROS MÓDULOS
        ===================================== */}


        {activePage === 'Configuración' && (

          <section className="settings-page">

            <div className="settings-header">
              <p className="section-label">PREFERENCIAS DE VÉRTIX</p>
              <h2>Configuración</h2>
              <p>Administra tu cuenta y personaliza tu experiencia.</p>
            </div>

            <div className="settings-grid">

              {/* MI PERFIL */}
              <div className="panel settings-card">
                <div className="settings-card-header">
                  <span className="settings-icon">👤</span>
                  <div>
                    <h3>Mi perfil</h3>
                    <p>Información de tu cuenta</p>
                  </div>
                </div>

                <div className="settings-info">
                  <label>Nombre</label>

                  <input
                    type="text"
                    value={nombrePerfil}
                    onChange={(e) => setNombrePerfil(e.target.value)}
                    placeholder="Ingresa tu nombre"
                  />

                  <label>Correo electrónico</label>
                  <p>{session?.user?.email || 'No disponible'}</p>

                  <button
                    className="save-settings-button"
                    onClick={guardarPerfil}
                    disabled={guardandoPerfil}
                  >
                    {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
                  </button>

                </div>
              </div>


              {/* PREFERENCIAS */}
              <div className="panel settings-card">

                <div className="settings-card-header">
                  <span className="settings-icon">⚙️</span>
                  <div>
                    <h3>Preferencias</h3>
                    <p>Personaliza tu negocio</p>
                  </div>
                </div>

                <div className="settings-info">

                  <label>Moneda del negocio</label>

                  <select
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    style={{
                      colorScheme: 'dark',
                      backgroundColor: '#171321',
                      color: '#f5f3ff'
                    }}
                  >
                    <option value="COP">Peso colombiano (COP)</option>
                    <option value="USD">Dólar estadounidense (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>

                  <label>Idioma</label>
                  <p>Español</p>

                  <button
                    className="save-settings-button"
                    onClick={guardarMoneda}
                    disabled={guardandoMoneda}
                  >
                    {guardandoMoneda ? 'Guardando...' : 'Guardar preferencias'}
                  </button>

                </div>

              </div>



              {/* NOTIFICACIONES */}
              <div className="panel settings-card">
                <div className="settings-card-header">
                  <span className="settings-icon">🔔</span>
                  <div>
                    <h3>Notificaciones</h3>
                    <p>Controla tus avisos</p>
                  </div>
                </div>

                <div className="settings-info">
                  <p>Próximamente podrás configurar tus alertas y recordatorios.</p>
                </div>
              </div>

              {/* SEGURIDAD */}
              <div className="panel settings-card">
                <div className="settings-card-header">
                  <span className="settings-icon">🔒</span>
                  <div>
                    <h3>Seguridad</h3>
                    <p>Protege tu cuenta</p>
                  </div>
                </div>

                <div className="settings-info">
                  <p>Tu cuenta está protegida mediante autenticación.</p>
                </div>
              </div>

            </div>
          </section>

        )}


        {/* PIE DE PÁGINA */}

        <footer>
          VÉRTIX © 2026 — Gestiona, analiza y haz crecer tu negocio.
        </footer>

      </main>

    </div>
  )
}

export default App




