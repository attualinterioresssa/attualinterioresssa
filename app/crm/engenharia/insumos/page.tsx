"use client";
import Catalogo from "@/components/engenharia/Catalogo";

const CATEGORIAS = ["insumo", "embalagem"];

export default function Pagina() {
  return (
    <>
      <h2>Insumos e embalagens</h2>
      <Catalogo categorias={CATEGORIAS} />
    </>
  );
}
