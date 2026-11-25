"use client";
import Catalogo from "@/components/engenharia/Catalogo";

const CATEGORIAS = ["ferragem"];

export default function Pagina() {
  return (
    <>
      <h2>Ferragens e acessórios</h2>
      <Catalogo categorias={CATEGORIAS} />
    </>
  );
}
