import React, { useState } from "react";
//Components
import CriteriaForm from "../../forms/CriteriaForm";
import AlternativesForm from "../../forms/AlternativesForm";
import MatrixTable from "../../components/MatrixTable";
import NormalizationForm from "../../forms/NormalizationForm";
import {
  normalizeByMax,
  normalizeByRootSum,
  normalizeByMaxMinDiff,
  normalizeBySum,
} from "../../utils/Normalization";
import { toMatrix } from "../../utils/MatrixFunctions";
import { Steps, Button, Table } from "antd";
import { cloneDeep } from "lodash";
import { series } from "async";

import "./lineal.scss";

export default function Lineal() {
  //Loading State
  const [isLoading, setIsLoading] = useState(true);

  const [current, setCurrent] = useState(0);
  const [criteria, setCriteria] = useState([]);
  const [normalization, setNormalization] = useState(null);
  const [alternatives, setAlternatives] = useState(null);
  //Matrix
  const [normalizedMatrix, setNormalizedMatrix] = useState([]);
  const [ponderatedMatrix, setPonderatedMatrix] = useState([]);
  const [resultMatrix, setResultMatrix] = useState([]);
  //Table Column
  const [tableColumns, setTableColumns] = useState([
    {
      title: "Alternativa",
      dataIndex: "name",
      key: "name",
    },
  ]);
  //Result Table Column
  const resultTableColumn = [
    {
      title: "Alternativa",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Valor",
      dataIndex: "value",
      key: "value",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.value - b.value,
    },
  ];
  //Steps////////////////////////
  const { Step } = Steps;

  const next = () => {
    setCurrent(current + 1);
  };

  const goTo = (page) => {
    setCurrent(page);
  };

  //Matrix to JSON
  const matrixToJson = (alternatives, matrix, criteria) => {
    var resultJson = cloneDeep(alternatives);
    for (var i = 0; i < alternatives.length; i++) {
      for (var j = 0; j < criteria.length; j++) {
        resultJson[i][criteria[j].name] = matrix[j][i];
      }
    }
    return resultJson;
  };

  //Función para maximizar los minimos
    const maximizarMinimo = (alternatives, matrix, criteria) => {
      for (let i = 0; i < criteria.length; i++) {  
        if (criteria[i].kind === "min") {
          for (let j = 0; j < alternatives.length; j++) {
            matrix[i][j] = 1/matrix[i][j];      
           }
            criteria[i].kind = "max"
          }
        }
    }


  const normalizeMatrix = (matrix, alternatives, criteria) => {
    //First Step - Normalice Matrix

    switch (normalization) {
      case "maximum":
        matrix = normalizeByMax(matrix, criteria);
        break;
      case "sum":
        matrix = normalizeBySum(matrix);
        break;
      case "root":
        matrix = normalizeByRootSum(matrix);
        break;
      case "difference":
        matrix = normalizeByMaxMinDiff(matrix);
        break;
      default:
        break;
    }
    //Unify normalized matrix with Alternatives
    //UTILIZAR FUNCION MATRIX TO JSON
    setNormalizedMatrix(matrixToJson(alternatives, matrix, criteria));
    //Returns normalized matrix without indexes to keep working
    return matrix;
  };

  //Criteria to Column - Creates columns based on the criterias
  const criteriaToColumn = (criteria) => {
    var criteriaNames = [];
    criteria.forEach((criteria) => {
      var column = {
        title: criteria.name,
        dataIndex: criteria.name,
        key: criteria.name,
      };
      criteriaNames.push(column);
    });
    tableColumns.push(...criteriaNames);
    setTableColumns(tableColumns);
  };

  //Esta funcion pondera la matriz
  const ponderateMatrix = (matrix, criteria) => {
    for (var i = 0; i < matrix.length; i++) {
      for (var j = 0; j < matrix[i].length; j++) {
        matrix[i][j] = matrix[i][j] * criteria[i].weight;
      }
    }
    return matrix;
  };

  //Esta funcion sumariza y retorna el resultado final
  const sumarize = (matrix, alternatives, criteria) => {
    var results = [];
    for (var j = 0; j < matrix[0].length; j++) {
      var sum = 0;
      for (var i = 0; i < matrix.length; i++) {
        if (criteria[i].kind === "max") {
          sum += matrix[i][j];
        } else {
          sum -= matrix[i][j];
        }
      }
      results.push({
        name: alternatives[j].name,
        value: sum,
      });
    }
    return results;
  };

  //Funcion de Calculo
  const calculate = () => {
    setIsLoading(true);
    //Matriz Global
    var matrix = [];
    series(
      [
        function (callback) {
          //Configuracion Inicial
          //Seteo Columnas de Tabla

          criteriaToColumn(criteria);
          //Paso los valores de cada criterio a una matriz para poder trabajarla
          matrix = toMatrix(criteria, alternatives);
          maximizarMinimo(alternatives, matrix, criteria)
          callback(null, "Configuracion Inicial");
        },
        function (callback) {
          //Normalizacion - Se modifica la matriz global y tambien se guarda la normalizada para mostrar
          //dentro de la funcion normalize


          matrix = normalizeMatrix(matrix, alternatives, criteria);

          callback(null, "Normalizada");
        },
        function (callback) {
          //Ponderamos la matriz
          matrix = ponderateMatrix(matrix, criteria);
          //Mostramos la matriz ponderada
          var pondMatrix = cloneDeep(matrix);
          setPonderatedMatrix(matrixToJson(alternatives, pondMatrix, criteria));
          callback(null, "Ponderada");
        },
        function (callback) {
          //Sumarizamos los pesos y obtenemos el resultado final
          setResultMatrix(sumarize(matrix, alternatives, criteria));
          callback(null, "Resultado");
        },
      ],
      // optional callback
      function (err, results) {
        //Terminar Carga
        setIsLoading(false);
      }
    );
  };

  const steps = [
    {
      title: "Criterios",
      content: <CriteriaForm next={next} setCriteria={setCriteria} />,
    },
    {
      title: "Alternativas",
      content: (
        <AlternativesForm
          next={next}
          criteria={criteria}
          setAlternatives={setAlternatives}
        />
      ),
    },
    {
      title: "Matriz",
      content: (
        <>
          <MatrixTable data={alternatives} criteria={criteria} />
          <NormalizationForm
            setNormalization={setNormalization}
            next={next}
            calculate={calculate}
            buttonTitle={"Siguiente"}
            distance={false}
          />
        </>
      ),
    },
    {
      title: "Resultado",
      content: (
        <>
          {isLoading ? (
            <></>
          ) : (
            <>
              <h3>Matriz Normalizada</h3>
              <Table
                columns={tableColumns}
                dataSource={normalizedMatrix}
                pagination={false}
              />
              <h3>Matriz Ponderada</h3>
              <Table
                columns={tableColumns}
                dataSource={ponderatedMatrix}
                pagination={false}
              />
              <h3>Resultado</h3>
              <Table
                columns={resultTableColumn}
                dataSource={resultMatrix}
                pagination={false}
              />
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="lineal">
      <h2>Ponderación Lineal</h2>
      <div className="lineal-content">
        <Steps current={current}>
          {steps.map((item) => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>
        <div className="steps-content">{steps[current].content}</div>
        <a href="/home">
          <Button shape="round" style={{ marginTop: 15 }}>
            Menú Principal
          </Button>
        </a>
        <a href="/home/lineal">
          <Button shape="round" type="primary" style={{ marginLeft: 15 }}>
            Calcular de Nuevo
          </Button>
        </a>
      </div>
    </div>
  );
}

